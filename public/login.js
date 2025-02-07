// Listen for form submission
document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault(); // Prevent default form submission

    const usernameOrEmail = document.getElementById('usernameOrEmail').value; // Use this field for either username or email
    const password = document.getElementById('password').value;

    // Send the login request to the server
    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            usernameOrEmail: usernameOrEmail, // Send the username or email
            password: password,
        }),
    })
    .then(response => {
        if (response.ok) {
            window.location.href = '/main'; // Redirect to main page if login is successful
        } else {
            alert('Invalid credentials!');
        }
    })
    .catch(error => {
        console.error('Error logging in:', error);
        alert('Error logging in. Please try again.');
    });
});

// Function to redirect to the signup page
function redirectToSignUp() {
    window.location.href = '/register';  // Redirect to the register page
}

function forgotPassword() {
    window.location.href = "password.html";
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
