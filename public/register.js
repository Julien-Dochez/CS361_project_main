// register.js

document.getElementById('registerForm').addEventListener('submit', function (e) {
    e.preventDefault(); // Prevent the form from submitting the default way

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Send the signup request to the server
    fetch('/signup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: username,
            password: password,
        }),
    })
    .then(response => {
        if (response.ok) {
            alert('User registered successfully');
            window.location.href = '/login'; // Redirect to the login page after successful registration
        } else {
            alert('Error creating account. Please try again.');
        }
    })
    .catch(error => {
        console.error('Error registering user:', error);
        alert('Error registering user. Please try again.');
    });
});