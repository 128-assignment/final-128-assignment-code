const http = require('http');
const fs = require('fs');
const mysql = require('mysql');
const querystring = require('querystring');
const path = require('path');

// Simple in-memory session (for demo only; resets on server restart)
let session = {};
function setSession(username, userType, userId) {
  session = { userName: username, userType, userId };
}
function getSession() {
  return session;
}
function deleteSession() {
  session = {};
}

// DB connection helper
function connectToDB() {
  return mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "f9thRaM.",
    database: "loginSystem"
  });
}

http.createServer((req, res) => {
  let body = "";

    // === LOGIN ===
    if (req.url === "/login") {
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            body = querystring.parse(body);

            const username = body.username?.trim();
            const password = body.password?.trim();
            console.log("Login attempt with:", username, password);

            const con = connectToDB();
            con.connect(err => {
                if (err) throw err;

                const checkUser = "SELECT * FROM users WHERE username = ? AND password = ?";
                con.query(checkUser, [username, password], (err, userResult) => {
                    if (err) throw err;

                    console.log("User query result:", userResult);

                    if (userResult.length > 0) {
                        setSession(username, "user", userResult[0].id);
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.write(`<html><body>
                            <script>
                                alert('Login successful!');
                                window.location.href = "/home.html";
                            </script>
                        </body></html>`);
                        return res.end();
                    } else {
                        const checkCompany = "SELECT * FROM companies WHERE company_name = ? AND password = ?";
                        con.query(checkCompany, [username, password], (err, companyResult) => {
                            if (err) throw err;

                            console.log("Company query result:", companyResult);

                            if (companyResult.length > 0) {
                                setSession(username, "company", companyResult[0].id);
                                res.writeHead(200, { 'Content-Type': 'text/html' });
                                res.write(`<html><body>
                                    <script>
                                        alert('Login successful!');
                                        window.location.href = "/home.html";
                                    </script>
                                </body></html>`);
                                return res.end();
                            } else {
                                res.writeHead(200, { 'Content-Type': 'text/html' });
                                res.write(`<html><body>
                                    <script>
                                        alert('Incorrect username or password.');
                                        window.location.href = "/login.html";
                                    </script>
                                </body></html>`);
                                return res.end();
                            }
                        });
                    }
                });
            });
        });

    // === REGISTER ===
    } else if (req.url === "/register") {
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            body = querystring.parse(body);

            const type = body.type;
            const password = body.password?.trim();
            const confirmPassword = body.confirm_password?.trim();

            if (password !== confirmPassword) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.write(`<html><body>
                    <script>
                        alert("Passwords do not match.");
                        window.location.href = "/login.html";
                    </script>
                </body></html>`);
                return res.end();
            }

            const con = connectToDB();

            if (type === "user") {
                const username = body.username?.trim();
                const email = body.email?.trim();
                const dob = body.dob;

                const sql = `INSERT INTO users (username, email, password, date_of_birth) VALUES (?, ?, ?, ?)`;
                const values = [username, email, password, dob];

                con.query(sql, values, (err) => {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.write(`<html><body>
                        <script>
                            alert('${err ? 'Registration failed.' : 'User account created!'}');
                            window.location.href = "/login.html";
                        </script>
                    </body></html>`);
                    return res.end();
                });

            } else if (type === "company") {
                const companyName = body.companyName?.trim();
                const email = body.email?.trim();
                const phone = body.companyNumber?.trim();

                const sql = `INSERT INTO companies (company_name, email, phone, password) VALUES (?, ?, ?, ?)`;
                const values = [companyName, email, phone, password];

                con.query(sql, values, (err) => {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.write(`<html><body>
                        <script>
                            alert('${err ? 'Registration failed.' : 'Company account created!'}');
                            window.location.href = "/login.html";
                        </script>
                    </body></html>`);
                    return res.end();
                });
            }
        });

  // display posted internships by Company
  } else if (req.url === "/get-company-internships" && req.method === "GET") {
    const session = getSession();
    if (!session.userId || session.userType !== "company") {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: "Unauthorized" }));
      return;
    }

    const con = connectToDB();
    const sql = `
      SELECT * FROM internships 
      WHERE company_id = ? AND (is_deleted IS NULL OR is_deleted = 0)
      ORDER BY start_date DESC
    `;

    con.query(sql, [session.userId], (err, results) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      if (err) {
        res.end(JSON.stringify({ success: false, error: err.message }));
      } else {
        res.end(JSON.stringify({ success: true, internships: results }));
      }
    });

  // update internship details
  } else if (req.url === "/update-internship" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end", () => {
      const form = querystring.parse(body);
      const session = getSession();

      if (!session.userId || session.userType !== "company") {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Unauthorized" }));
        return;
      }

      const {
        id,
        title,
        department,
        start,
        end,
        location,
        stipend,
        description,
        requirements,
      } = form;

      if (!id) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Missing internship id" }));
        return;
      }

      const con = connectToDB();

      // Make sure this internship belongs to the logged-in company
      const checkSql = "SELECT * FROM internships WHERE id = ? AND company_id = ?";
      con.query(checkSql, [id, session.userId], (err, results) => {
        if (err || results.length === 0) {
          res.writeHead(403, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, error: "Forbidden or not found" }));
          return;
        }

        const updateSql = `
          UPDATE internships SET
            title = ?, department = ?, start_date = ?, end_date = ?,
            location = ?, stipend = ?, description = ?, requirements = ?
          WHERE id = ? AND company_id = ?
        `;

        con.query(
          updateSql,
          [
            title,
            department,
            start,
            end,
            location,
            stipend,
            description,
            requirements,
            id,
            session.userId,
          ],
          (err) => {
            res.writeHead(200, { "Content-Type": "application/json" });
            if (err) {
              res.end(JSON.stringify({ success: false, error: err.message }));
            } else {
              res.end(JSON.stringify({ success: true }));
            }
          }
        );
      });
    });

  // delete internship from student site
  } else if (req.url === "/delete-internship" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end", () => {
      const form = querystring.parse(body);
      const session = getSession();

      if (!session.userId || session.userType !== "company") {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Unauthorized" }));
        return;
      }

      const { id } = form;

      if (!id) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Missing internship id" }));
        return;
      }

      const con = connectToDB();

      // Soft delete by setting is_deleted = 1
      const sql = "UPDATE internships SET is_deleted = 1 WHERE id = ? AND company_id = ?";
      con.query(sql, [id, session.userId], (err) => {
        res.writeHead(200, { "Content-Type": "application/json" });
        if (err) {
          res.end(JSON.stringify({ success: false, error: err.message }));
        } else {
          res.end(JSON.stringify({ success: true }));
        }
      });
    });

  // get company profile values
  } else if (req.url === "/get-company-profile" && req.method === "GET") {
    const sessionData = getSession();
    if (!sessionData.userId || sessionData.userType !== "company") {
      res.writeHead(401);
      res.end(JSON.stringify({ success: false, error: "Unauthorized" }));
      return;
    }
    const con = connectToDB();
    const sql = "SELECT company_name, email, phone, password, bio FROM companies WHERE id = ?";
    con.query(sql, [sessionData.userId], (err, result) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      if (err || result.length === 0) {
        res.end(JSON.stringify({ success: false }));
      } else {
        res.end(JSON.stringify({ success: true, company: result[0] }));
      }
    });

  // Update company profile VALUES
  } else if (req.url === "/update-company-profile" && req.method === "POST") {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      const form = querystring.parse(body);
      const sessionData = getSession();
      if (!sessionData.userId || sessionData.userType !== "company") {
        res.writeHead(401);
        res.end("Unauthorized");
        return;
      }

      const con = connectToDB();
      const updateFields = ['company_name = ?', 'email = ?', 'phone = ?', 'bio = ?'];
      const values = [form.name, form.email, form.phonenum, form.bio];

      if (form.password && form.password.trim() !== "") {
        updateFields.push('password = ?');
        values.push(form.password);
      }

      const sql = `UPDATE companies SET ${updateFields.join(', ')} WHERE id = ?`;
      values.push(sessionData.userId);

      con.query(sql, values, err => {
        if (err) {
          res.writeHead(500);
          res.end("Failed to update profile.");
        } else {
          res.writeHead(200);
          res.end("Profile updated successfully.");
        }
      });
    });

  // Create internship route (company only)
  } else if (req.url === "/submit-internship" && req.method === "POST") {
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      const form = querystring.parse(body);
      const con = connectToDB();
      const session = getSession();
      const companyId = session.userId;

      if (!companyId || session.userType !== "company") {
        res.writeHead(401);
        res.end("Unauthorized");
        return;
      }

      const sql = `INSERT INTO internships (company_id, title, department, start_date, end_date, location, stipend, description, requirements) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      const values = [companyId, form.title, form.department, form.start, form.end, form.location, form.stipend, form.description, form.requirements];

      con.query(sql, values, (err) => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<script>alert("${err ? "Failed to create internship" : "Internship created successfully"}"); window.location.href = "/createinternships.html";</script>`);
      });
    });
	
  // Show company's applications
  
  } else if (req.url === "/get-applications" && req.method === "GET") {
  const session = getSession();
  if (!session.userId || session.userType !== "company") {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: false, error: "Unauthorized" }));
    return;
  }

  const con = connectToDB();
  const sql = `
  SELECT 
    a.id,
    a.fullname,
    a.email,
    a.phone,
    a.bio,
    a.resume_link,
    i.title AS internship_title,
    a.status
  FROM applications a
  JOIN internships i ON a.internship_id = i.id
  WHERE i.company_id = ?
  ORDER BY i.start_date DESC
  `;

  con.query(sql, [session.userId], (err, results) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    if (err) {
      res.end(JSON.stringify({ success: false, error: err.message }));
    } else {
      res.end(JSON.stringify({ success: true, applications: results }));
    }
  });



  // Get all internships for listing
} else if (req.url.startsWith("/get-internships") && req.method === "GET") {
  const con = connectToDB();
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const keyword = parsedUrl.searchParams.get("keyword") || "";
  const domain = parsedUrl.searchParams.get("domain") || "";
  const location = parsedUrl.searchParams.get("location") || "";

  let sql = `
    SELECT internships.*, companies.company_name 
    FROM internships 
    JOIN companies ON internships.company_id = companies.id 
    WHERE end_date >= CURDATE() AND (internships.is_deleted IS NULL OR internships.is_deleted = 0)
  `;

  const filters = [];
  const values = [];

  if (keyword) {
    filters.push(`
      (
        internships.title LIKE ? OR
        internships.department LIKE ? OR
        internships.location LIKE ? OR
        internships.stipend LIKE ? OR
        internships.requirements LIKE ? OR
        internships.description LIKE ?
      )
    `);
    for (let i = 0; i < 6; i++) {
      values.push(`%${keyword}%`);
    }
  }

  if (domain) {
    filters.push(`internships.department = ?`);
    values.push(domain);
  }

  if (location) {
    filters.push(`internships.location = ?`);
    values.push(location);
  }

  if (filters.length > 0) {
    sql += ` AND ` + filters.join(" AND ");
  }

  con.query(sql, values, (err, result) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    if (err) {
      res.end(JSON.stringify({ success: false, error: err.message }));
    } else {
      res.end(JSON.stringify({ success: true, internships: result }));
    }
  });

  // --- NEW: Save selected internship id in session and redirect to apply ---
  } else if (req.url === "/start-application" && req.method === "POST") {
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      const form = querystring.parse(body);
      const internshipId = form.internship_id;
      if (!internshipId) {
        res.writeHead(400);
        res.end("Missing internship ID");
        return;
      }
      // Save selected internship in session for apply.html to use
      session.selectedInternshipId = internshipId;

      // Redirect to apply page without query params
      res.writeHead(302, { Location: "/apply.html" });
      res.end();
    });

  // --- Get selected internship details for apply.html ---
  } else if (req.url === "/get-selected-internship" && req.method === "GET") {
    const internshipId = session.selectedInternshipId;
    if (!internshipId) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: "No internship selected" }));
      return;
    }
    const con = connectToDB();
    const sql = "SELECT * FROM internships WHERE id = ?";
    con.query(sql, [internshipId], (err, results) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      if (err || results.length === 0) {
        res.end(JSON.stringify({ success: false, error: "Internship not found" }));
      } else {
        res.end(JSON.stringify({ success: true, internship: results[0] }));
      }
    });

  // Apply for internship (student only, prevent multiple applications)
} else if (req.url === "/submit-application" && req.method === "POST") {
  let body = "";
  req.on('data', chunk => body += chunk.toString());
  req.on('end', () => {
    let form;
    try {
      form = JSON.parse(body);
    } catch (e) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: "Invalid JSON" }));
      return;
    }

    const session = getSession();
    if (!session.userId || session.userType !== "user") {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: "Unauthorized" }));
      return;
    }

    const con = connectToDB();
    const { internship_id, resume_link } = form;
    const userId = session.userId;

    // Trim phone and bio from form (optional)
    const phone = (form.phone || '').trim();
    const bio = (form.bio || '').trim();

    // First fetch user fullname and email
    const userSql = "SELECT username AS fullname, email FROM users WHERE id = ?";
    con.query(userSql, [userId], (err, userResults) => {
      if (err || userResults.length === 0) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Failed to get user info" }));
        return;
      }
      const user = userResults[0];

      // Check if already applied
      const checkSql = "SELECT * FROM applications WHERE internship_id = ? AND user_id = ?";
      con.query(checkSql, [internship_id, userId], (err, existingApps) => {
        if (err) {
          res.writeHead(500);
          res.end(JSON.stringify({ success: false, error: err.message }));
          return;
        }
        if (existingApps.length > 0) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, error: "You have already applied for this internship." }));
          return;
        }

        // Insert new application with submitted phone and bio
        const insertSql = `
          INSERT INTO applications 
          (internship_id, user_id, fullname, email, phone, bio, resume_link, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')
        `;
        con.query(insertSql, [
          internship_id,
          userId,
          user.fullname,
          user.email,
          phone,
          bio,
          resume_link
        ], (err) => {
          res.writeHead(200, { "Content-Type": "application/json" });
          if (err) {
            res.end(JSON.stringify({ success: false, error: err.message }));
          } else {
            res.end(JSON.stringify({ success: true }));
          }
        });
      });
    });
  });

  // Get all applications for logged in student
  } else if (req.url === "/get-my-applications" && req.method === "GET") {
    const session = getSession();
    if (!session.userId || session.userType !== "user") {
      res.writeHead(401);
      res.end(JSON.stringify({ success: false, error: "Unauthorized" }));
      return;
    }
    const con = connectToDB();
    const sql = `
      SELECT 
      a.id,
      i.title,
      c.company_name,
      i.department,
      i.start_date,
      i.description,
      i.requirements,
      i.location,
      i.stipend,
      a.status,
      a.resume_link
    FROM applications a
    JOIN internships i ON a.internship_id = i.id
    JOIN companies c ON i.company_id = c.id
    WHERE a.user_id = ?
    ORDER BY i.start_date DESC
  `;
    con.query(sql, [session.userId], (err, results) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      if (err) {
        res.end(JSON.stringify({ success: false, error: err.message }));
      } else {
        res.end(JSON.stringify({ success: true, applications: results }));
      }
    });

  // Withdraw application (delete)
  } else if (req.url === "/withdraw-application" && req.method === "POST") {
    let body = "";
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      const form = querystring.parse(body);
      const session = getSession();
      if (!session.userId || session.userType !== "user") {
        res.writeHead(401);
        res.end(JSON.stringify({ success: false, error: "Unauthorized" }));
        return;
      }
      const con = connectToDB();
      const { id } = form;
      const sql = "DELETE FROM applications WHERE id = ? AND user_id = ?";
      con.query(sql, [id, session.userId], (err) => {
        res.writeHead(200, { "Content-Type": "application/json" });
        if (err) {
          res.end(JSON.stringify({ success: false, error: err.message }));
        } else {
          res.end(JSON.stringify({ success: true }));
        }
      });
    });

  // --- FIXED ROUTE: Update application status (company only) ---
  } else if (req.url === "/update-application-status" && req.method === "POST") {
    let body = "";
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        // parse JSON since client sends application/json
        const form = JSON.parse(body);
        const session = getSession();
        if (!session.userId || session.userType !== "company") {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, error: "Unauthorized" }));
          return;
        }
        const con = connectToDB();
        const { id, status } = form;

        if (!id || !status) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, error: "Missing id or status" }));
          return;
        }

        const sql = "UPDATE applications SET status = ? WHERE id = ?";
        con.query(sql, [status, id], (err) => {
          res.writeHead(200, { "Content-Type": "application/json" });
          if (err) {
            res.end(JSON.stringify({ success: false, error: err.message }));
          } else {
            res.end(JSON.stringify({ success: true }));
          }
        });
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Invalid JSON" }));
      }
    });
	
	// GET /getProfile: Fetch student name, email, and password
  }else if (req.url === "/getProfile" && req.method === "GET") {
    const sessionData = getSession();
    if (!sessionData.userId || sessionData.userType !== "user") {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: "Unauthorized" }));
      return;
    }

      const con = connectToDB();
	  const sql = "SELECT username AS name, email, password FROM users WHERE id = ?";
	  con.query(sql, [sessionData.userId], (err, result) => {
		res.writeHead(200, { "Content-Type": "application/json" });
		if (err || result.length === 0) {
		  res.end(JSON.stringify({ success: false }));
		} else {
		  res.end(JSON.stringify({ success: true, ...result[0] }));
		}
	  });


  // POST /updateProfile: Update student name, email, and password
} else if (req.url === "/updateProfile" && req.method === "POST") {
  let body = '';
  req.on('data', chunk => body += chunk.toString());
  req.on('end', () => {
    const sessionData = getSession();
    if (!sessionData.userId || sessionData.userType !== "user") {
      res.writeHead(401);
      res.end("Unauthorized");
      return;
    }

    try {
      const form = JSON.parse(body);
      const name = form.name?.trim();
      const email = form.email?.trim();
      const password = form.password?.trim();

      if (!name || !email) {
        res.writeHead(400);
        res.end("Missing required fields");
        return;
      }

      const con = connectToDB();

      // Update with or without password
      let sql, params;
      if (password && password.length > 0) {
        sql = "UPDATE users SET username = ?, email = ?, password = ? WHERE id = ?";
        params = [name, email, password, sessionData.userId];
      } else {
        sql = "UPDATE users SET username = ?, email = ? WHERE id = ?";
        params = [name, email, sessionData.userId];
      }

      con.query(sql, params, (err) => {
        if (err) {
          res.writeHead(500);
          res.end("Failed to update profile");
        } else {
          res.writeHead(200);
          res.end("Profile updated successfully");
        }
      });
    } catch (err) {
      res.writeHead(400);
      res.end("Invalid JSON");
    }
  });




  // Serve static files for HTML, CSS, JS, images, etc.
  } else {
    const filePath = req.url === "/" ? "/login.html" : req.url;
    const extname = path.extname(filePath);
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.json': 'application/json',
      '.ico': 'image/x-icon',
    };

    fs.readFile(__dirname + filePath, (err, content) => {
      if (err) {
        res.writeHead(404);
        res.end("404 Not Found");
      } else {
        res.writeHead(200, { 'Content-Type': mimeTypes[extname] || 'application/octet-stream' });
        res.end(content);
      }
    });
  }
  }).listen(8080, () => console.log("Server running on http://localhost:8080"));
