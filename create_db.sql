CREATE DATABASE ForumApp; 
USE ForumApp;

CREATE TABLE userDetails (userID INT AUTO_INCREMENT, email VARCHAR(60) NOT NULL, username VARCHAR(50) NOT NULL UNIQUE, password VARCHAR(60) NOT NULL, PRIMARY KEY(userID));
CREATE TABLE topics (topicID INT AUTO_INCREMENT, name VARCHAR(255) NOT NULL, description TEXT, PRIMARY KEY(topicID));
CREATE TABLE userTopics (userID INT, topicID INT, PRIMARY KEY(userID, topicID), FOREIGN KEY (userID) REFERENCES userDetails(userID), FOREIGN KEY (topicID) REFERENCES topics(topicID));
CREATE TABLE posts (postID INT AUTO_INCREMENT, userID INT, topicID INT, username VARCHAR(50), title VARCHAR(255) NOT NULL, content TEXT NOT NULL, postDate DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(postID), FOREIGN KEY (userID) REFERENCES userDetails(userID), FOREIGN KEY (topicID) REFERENCES topics(topicID));

CREATE USER 'appuser'@'localhost' IDENTIFIED WITH mysql_native_password BY 'app2027'; 
GRANT ALL PRIVILEGES ON ForumApp.* TO 'appuser'@'localhost';
