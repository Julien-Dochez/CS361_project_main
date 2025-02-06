document.addEventListener('DOMContentLoaded', function() {
    // Handle password reset form submission (forgot password)
    document.getElementById('forgotPasswordForm').addEventListener('submit', function(e) {
        e.preventDefault(); // Prevent default form submission

        const email = document.getElementById('email').value; // Get email entered for password reset

        // Send the email to your server for password reset
        fetch('/send-reset-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Reset link sent. Please check your email.');
                // Redirect to the password reset page with the email as a query parameter
                window.location.href = '/password-reset.html?email=' + encodeURIComponent(email);
            } else {
                alert(data.message || 'Error sending reset link. Please try again.');
            }
        })
        .catch(error => {
            console.error('Error:', error); // Log the error for debugging
            alert('Error sending reset link. Please try again.');
        });
    });

    // Handle username retrieval form submission (forgot username)
    document.getElementById('forgotUsernameForm').addEventListener('submit', function(e) {
        e.preventDefault(); // Prevent default form submission

        const email = document.getElementById('usernameEmail').value; // Get the email entered for username retrieval

        // Send the email to your server to retrieve the username
        fetch('/send-username', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Your username has been sent to your email.');
            } else {
                alert(data.message || 'Error sending username. Please try again.');
            }
        })
        .catch(error => {
            console.error('Error:', error); // Log the error for debugging
            alert('Error sending username. Please try again.');
        });
    });
});