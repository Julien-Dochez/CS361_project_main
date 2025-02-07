// Function to open the help modal
function showHelpPopup() {
    document.getElementById('helpPopup').style.display = 'block';
}

// Function to close the help modal
function closeHelpPopup() {
    document.getElementById('helpPopup').style.display = 'none';
}

// Logout function
function logout() {
    fetch('/logout', { method: 'POST' })
    .then(() => {
        window.location.href = '/login';
    });
}

// Function to redirect to a specific page
function redirectToPage(page) {
    window.location.href = `/${page}`;
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
