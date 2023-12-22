// Importing necessary modules
const { check, validationResult } = require('express-validator');

// Main module export
module.exports = (app, forumData) => {
    // Middleware to redirect unauthenticated users to the login page
    const redirectLogin = (req, res, next) => {
        if (!req.session.userId) {
            res.redirect('/login');
        } else {
            next();
        }
    };

    // Helper function to render templates with base data
    const renderTemplate = (req, res, template, data) => {
        const baseData = {
            loggedIn: req.session.userId ? true : false,
            ...forumData
        };
        res.render(template, { ...baseData, ...data });
    };

    // Route for the Home Page
    app.get('/', (req, res) => {
        renderTemplate(req, res, 'index.ejs', {});
    });

    // Routes for the Login page
    app.get('/login', (req, res) => {
        renderTemplate(req, res, 'login.ejs', {});
    });

    app.post('/loggedIn', (req, res) => {
        const username = req.sanitize(req.body.username);
        const plainPassword = req.sanitize(req.body.password);
        let sqlQuery = "SELECT userID, password FROM userDetails WHERE username = ?";

        // Query database for user
        db.query(sqlQuery, [username], (err, result) => {
            if (err) {
                console.log(err.message);
            } else if (result.length === 0) {
                renderTemplate(req, res, 'wrong-details.ejs', { forumName: forumData.forumName });
            } else {
                // Check if the entered password matches the stored one
                if (plainPassword === result[0].password) {
                    req.session.userId = result[0].userID;
                    renderTemplate(req, res, 'loggedIn.ejs', {});
                } else {
                    renderTemplate(req, res, 'wrong-details.ejs', { forumName: forumData.forumName });
                }
            }
        });
    });

    // Route for user registration
    app.get('/register', (req, res) => {
        renderTemplate(req, res, 'register.ejs', {});
    });

    //Route for handling user registration
    app.post('/registered', [check('email').isEmail()], (req, res) => {
        const errors = validationResult(req);
        // If there are errors, redirect to the registration page
        if (!errors.isEmpty()) {
            res.redirect('/register');
        } else {
            // If there are no errors, sanitize the user input and insert the new user into the database
            const plainPassword = req.sanitize(req.body.password);
            let sqlQuery = "INSERT INTO userDetails (email, username, password) VALUES (?, ?, ?)";
            let newUser = [req.sanitize(req.body.email), req.sanitize(req.body.username), plainPassword];

            // Insert new user into database
            db.query(sqlQuery, newUser, (err, result) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        res.send('This username is already taken. Please choose a different one.');
                    } else {
                        return console.error(err.message);
                    }
                } else {
                    let newData = Object.assign({}, forumData, { registeredUser: newUser });
                    renderTemplate(req, res, 'registered.ejs', newData);
                }
            });
        }
    });

    // Route to display the page for creating a new topic
    app.get('/createTopic', redirectLogin, (req, res) => {
        renderTemplate(req, res, 'createTopic.ejs', {});
    });

    // Handling the creation of a new topic
    app.post('/topicCreated', redirectLogin, (req, res) => {
        const name = req.sanitize(req.body.name);
        const description = req.sanitize(req.body.description);
        let sqlQuery = "INSERT INTO topics (name, description) VALUES (?, ?)";

        // Insert new topic into database
        db.query(sqlQuery, [name, description], (err, result) => {
            if (err) {
                return console.error(err.message);
            }
            renderTemplate(req, res, 'topicCreated.ejs', { topicName: name });
        });
    });

    // Route to display topics for joining
    app.get('/joinTopic', redirectLogin, (req, res) => {
        let sqlQuery = "SELECT * FROM topics";

        // Fetch all topics from database
        db.query(sqlQuery, (err, topics) => {
            if (err) {
                console.error("Error fetching topics: ", err);
                return res.status(500).send("Error fetching topics");
            }
            renderTemplate(req, res, 'joinTopic.ejs', { topics: topics });
        });
    });

    // Handling joining a topic
    app.post('/joinTopic', redirectLogin, (req, res) => {
        const userID = req.session.userId; // User ID from session
        const topicID = req.sanitize(req.body.topicID);

        // Check if user is already a member of the topic
        let checkQuery = "SELECT * FROM userTopics WHERE userID = ? AND topicID = ?";
        db.query(checkQuery, [userID, topicID], (err, result) => {
            if (err) {
                console.error("Error checking topic membership: ", err);
                return res.status(500).send("Error checking if user is already a member of the topic");
            }

            // If the user is already a member of the topic, send an error message
            if (result.length > 0) {
                return res.send("You are already a member of this topic.");
            } else {
                // If the user is not already a member of the topic, add them to the topic
                let sqlQuery = "INSERT INTO userTopics (userID, topicID) VALUES (?, ?)";
                db.query(sqlQuery, [userID, topicID], (err, result) => {
                    if (err) {
                        console.error("Error in joining topic: ", err);
                        return res.status(500).send("Error in joining topic");
                    }
                    let topicQuery = "SELECT name FROM topics WHERE topicID = ?";
                    db.query(topicQuery, [topicID], (err, topicResult) => {
                        if (err) {
                            console.error("Error in fetching topic name: ", err);
                            return res.status(500).send("Error in fetching topic name");
                        }
                        let topicName = topicResult[0].name;
                        renderTemplate(req, res, 'joinedTopic.ejs', { topicName: topicName });
                    });
                });
            }
        });
    });

    // Route to display the form for adding a post
    app.get('/addPost', redirectLogin, (req, res) => {
        // Query to get topics which the user is a member of
        let sqlQuery = "SELECT t.topicID, t.name FROM topics t JOIN userTopics ut ON t.topicID = ut.topicID WHERE ut.userID = ?";

        // Fetching topics for the dropdown in the form
        db.query(sqlQuery, [req.session.userId], (err, topics) => {
            if (err) {
                return console.error(err.message);
            }
            renderTemplate(req, res, 'addPost.ejs', { topics: topics });
        });
    });

    // Handling the creation of a new post
    app.post('/postCreated', redirectLogin, (req, res) => {
        const title = req.sanitize(req.body.title);
        const content = req.sanitize(req.body.content);
        const topicID = req.sanitize(req.body.topicID);
        const userID = req.session.userId;

        // Check if the user is a member of the selected topic
        let membershipQuery = "SELECT * FROM userTopics WHERE userID = ? AND topicID = ?";
        db.query(membershipQuery, [userID, topicID], (err, membershipResult) => {
            if (err) {
                console.error(err.message);
                return res.status(500).send("Error checking topic membership");
            }
            // If the user is not a member of the topic, send an error message
            if (membershipResult.length === 0) {
                return res.send("You must be a member of this topic to post.");
            } else {
                // If the user is a member of the topic, fetch their username and insert the post into the database
                let userQuery = "SELECT username FROM userDetails WHERE userID = ?";
                db.query(userQuery, [userID], (err, userResult) => {
                    if (err) {
                        console.error(err.message);
                        return res.status(500).send("Error fetching user information");
                    }
                    let username = userResult[0].username;

                    // Insert post into database
                    let postQuery = "INSERT INTO posts (userID, topicID, title, content, username) VALUES (?, ?, ?, ?, ?)";
                    db.query(postQuery, [userID, topicID, title, content, username], (err, postResult) => {
                        if (err) {
                            console.error(err.message);
                            return res.status(500).send("Error creating post");
                        }
                        renderTemplate(req, res, 'addedPost.ejs', { postTitle: title, topicName: req.body.topicName });
                    });
                });
            }
        });
    });

     // Delete User page handler
    app.get('/deleteUser', redirectLogin, (req, res) => {
        renderTemplate(req, res, 'deleteUser.ejs', {});
    });

    // Route for handling user account deletion
    app.get('/deleteAccount', redirectLogin, (req, res) => {
        const loggedInUserID = req.session.userId;

        // Delete all user topic associations
        let deleteFromUserTopics = "DELETE FROM userTopics WHERE userID = ?";
        db.query(deleteFromUserTopics, [loggedInUserID], (err, result) => {
            if (err) {
                console.error("Error deleting from userTopics: ", err);
                return res.status(500).send("Error deleting user topic associations");
            }

            // Delete all posts by the user
            let deleteFromPosts = "DELETE FROM posts WHERE userID = ?";
            db.query(deleteFromPosts, [loggedInUserID], (err, result) => {
                if (err) {
                    console.error("Error deleting user posts: ", err);
                    return res.status(500).send("Error deleting user posts");
                }

                // Delete the user
                let deleteUser = "DELETE FROM userDetails WHERE userID = ?";
                db.query(deleteUser, [loggedInUserID], (err, result) => {
                    if (err) {
                        console.error("Error deleting account: ", err);
                        return res.status(500).send("Error deleting account");
                    }
                    req.session.destroy(() => {
                        res.send('Your account has been successfully deleted. <a href="/">Home</a>');
                    });
                });
            });
        });
    });

    // Route to list all users
    app.get('/listUsers', redirectLogin, (req, res) => {
        let sqlQuery = "SELECT email, username FROM userDetails";

        db.query(sqlQuery, (err, result) => {
            if (err) {
                return console.log("Error on listUsers route ", err.message);
            }
            let newData = Object.assign({}, forumData, { availableUsers: result });
            renderTemplate(req, res, 'listUsers.ejs', newData);
        });
    });

    // Route for the About page
    app.get('/about', (req, res) => {
        renderTemplate(req, res, 'about.ejs', {});
    });

    // Logout handler
    app.get('/logout', redirectLogin, (req, res) => {
        req.session.destroy(err => {
            if (err) {
                return res.redirect('/');
            }
            res.redirect('/');
        });
    });

    // Route to list all topics
    app.get('/listTopics', redirectLogin, (req, res) => {
        let sqlQuery = "SELECT topicID, name, description FROM topics";

        // Fetch all topics
        db.query(sqlQuery, (err, topics) => {
            if (err) {
                console.error("Error fetching topics: ", err);
                return res.status(500).send("Error fetching topics");
            }
            renderTemplate(req, res, 'listTopics.ejs', { topics: topics });
        });
    });

    // Route to list all posts
    app.get('/listPosts', redirectLogin, (req, res) => {
        // Query to get the post title, content and username of the user who posted it
        let sqlQuery = "SELECT p.postID, p.title, p.content, p.postDate, t.name AS topicName, u.username FROM posts p JOIN topics t ON p.topicID = t.topicID JOIN userDetails u ON p.userID = u.userID";

        // Fetch all posts
        db.query(sqlQuery, (err, posts) => {
            if (err) {
                console.error("Error fetching posts: ", err);
                return res.status(500).send("Error fetching posts");
            }
            renderTemplate(req, res, 'listPosts.ejs', { posts: posts });
        });
    });

    // Route for searching posts
    app.get('/searchPosts', redirectLogin, (req, res) => {
        let searchQuery = req.sanitize(req.query.searchQuery);
        // Query to get the post title, content and username of the user who posted it
        let sqlQuery = "SELECT p.title, p.content, u.username FROM posts p JOIN userDetails u ON p.userID = u.userID WHERE p.title LIKE ? OR p.content LIKE ?";

        // Search for posts with the search query in the title or content
        db.query(sqlQuery, ['%' + searchQuery + '%', '%' + searchQuery + '%'], (err, posts) => {
            if (err) {
                console.error("Error searching posts: ", err);
                return res.status(500).send("Error searching for posts");
            }
            renderTemplate(req, res, 'searchPosts.ejs', { posts: posts });
        });
    });

    // Route to display a user's own posts
    app.get('/myPosts', redirectLogin, (req, res) => {
        const userID = req.session.userId;
        let sqlQuery = "SELECT postID, title, content FROM posts WHERE userID = ?";

        // Fetch all posts by the user
        db.query(sqlQuery, [userID], (err, posts) => {
            if (err) {
                console.error("Error fetching user's posts: ", err);
                return res.status(500).send("Error fetching posts");
            }
            renderTemplate(req, res, 'myPosts.ejs', { posts: posts });
        });
    });

    // Route to delete a specific post
    app.post('/deletePost/:postID', redirectLogin, (req, res) => {
        const userID = req.session.userId;
        const postID = req.params.postID;

        // Delete the post from the database
        let sqlQuery = "DELETE FROM posts WHERE postID = ? AND userID = ?";
        db.query(sqlQuery, [postID, userID], (err, result) => {
            if (err) {
                console.error("Error deleting post: ", err);
                return res.status(500).send("Error deleting post");
            }
            res.redirect('/myPosts');
        });
    });
};
