-- Inserting sample users
USE ForumApp;
INSERT INTO userDetails (email, username, password) VALUES 
('alice@example.com', 'Alice', 'password123'),
('bob@example.com', 'Bob', 'password456'),
('carol@example.com', 'Carol', 'password789');

-- Inserting sample topics
INSERT INTO topics (name, description) VALUES 
('Technology', 'Discussion about the latest in tech'),
('Cooking', 'Share recipes and cooking tips'),
('Travel', 'Share your travel experiences and advice');