const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'f9thRaM.',
});

db.connect((err) => {
    if (err) throw err;
    console.log('Connected.');

    db.query('CREATE DATABASE IF NOT EXISTS loginSystem', (err, result) => {
        if (err) throw err;
        console.log('Database created or already exists.');
        
        db.changeUser({ database: 'loginSystem' }, (err) => {
            if (err) throw err;

            const createUsersTable = `
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(255) NOT NULL,
                    email VARCHAR(255) NOT NULL UNIQUE,
                    password VARCHAR(255) NOT NULL,
                    date_of_birth DATE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;

            db.query(createUsersTable, (err, result) => {
                if (err) throw err;
                console.log('Users table created or exists.');
            });

            const createCompaniesTable = `
                CREATE TABLE IF NOT EXISTS companies (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    company_name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) NOT NULL UNIQUE,
                    phone VARCHAR(50),
                    password VARCHAR(255) NOT NULL,
                    bio TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;

            db.query(createCompaniesTable, (err, result) => {
                if (err) throw err;
                console.log('Companies table created or exists.');
            });

            // Updated Internships table with department and requirements columns
            const createInternshipsTable = `
                CREATE TABLE IF NOT EXISTS internships (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    company_id INT NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    department VARCHAR(255),
                    start_date DATE,
                    end_date DATE,
                    location VARCHAR(255),
                    stipend VARCHAR(100),
                    description VARCHAR(300),
                    requirements VARCHAR(300),
					is_deleted TINYINT(1) DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
                )
            `;
            db.query(createInternshipsTable, (err, result) => {
                if (err) throw err;
                console.log('Internships table created or exists.');
            });

            const createApplicationsTable = `
                CREATE TABLE IF NOT EXISTS applications (
				  id INT AUTO_INCREMENT PRIMARY KEY,
				  user_id INT,
				  internship_id INT,
				  fullname VARCHAR(255),
				  email VARCHAR(255),
				  phone VARCHAR(50),
				  bio TEXT,
				  resume_link TEXT,
				  status ENUM('Pending', 'Accepted', 'Rejected') DEFAULT 'Pending'
				)

            `;
            db.query(createApplicationsTable, (err, result) => {
                if (err) throw err;
                console.log('Applications table created or exists.');
            });

        });
    });
});
