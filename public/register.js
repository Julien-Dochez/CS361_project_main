// register.js

document.getElementById('registerForm').addEventListener('submit', function (e) {
    e.preventDefault(); // Prevent the form from submitting the default way

    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value; // Get the email value
    const password = document.getElementById('password').value;

    // Send the signup request to the server
    fetch('/signup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: username,
            email: email, // Include the email in the request
            password: password,
        }),
    })
    .then(response => {
        if (response.ok) {
            alert('Account created successfully');
            window.location.href = '/login'; // Redirect to login page on success
        } else {
            return response.text().then(message => alert('Error: ' + message));
        }
    })
    .catch(error => {
        console.error('Error registering user:', error);
        alert('Error registering user. Please try again.');
    });
});

// Function to redirect back to the login page
function redirectToLogin() {
    window.location.href = '/login';
}

// Function to open the help modal
function showHelpPopup() {
    document.getElementById('helpPopup').style.display = 'block';
}

// Function to close the help modal
function closeHelpPopup() {
    document.getElementById('helpPopup').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function() {
    // Add event listener for closing the popup when clicking outside of it
    window.addEventListener('click', function(event) {
        const popup = document.getElementById('helpPopup');
        if (event.target === popup) {
            popup.style.display = 'none';
        }
    });
});

