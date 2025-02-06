document.addEventListener('DOMContentLoaded', function() {
    // Extract email parameter from URL
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');

    if (!email) {
        alert('Invalid or missing email address.');
        window.location.href = '/login'; // Redirect if no email in URL
        return;
    }

    document.getElementById('resetPasswordForm').addEventListener('submit', function(e) {
        e.preventDefault();

        const resetCode = document.getElementById('resetCode').value;
        const newPassword = document.getElementById('newPassword').value;

        fetch('/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, resetCode: resetCode, newPassword: newPassword }) // Only include the email from the URL
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Password reset successful. Please log in with your new password.');
                window.location.href = '/login';  // Redirect to login page
            } else {
                alert(data.message || 'Invalid reset code or error resetting password.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error resetting password. Please try again.');
        });
    });
});