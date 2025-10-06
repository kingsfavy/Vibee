async function fetchUsers() {
  try {
      const res = await fetch('http://localhost:3005/users');
      const data = await res.json();
      const container = document.getElementById('userList');

      if (data.success) {
          data.users.forEach(user => {
              const div = document.createElement('div');
              div.className = 'user';
              div.innerHTML = `${user.younrname}, ${user.username}`;
              div.style.cursor = 'pointer';

              // Add event listener to redirect to chat
              div.addEventListener('click', () => {
                  window.location.href = `/chat/${user.username}`;
                  document.getElementById("name").textContent = user.username;
              });

              container.appendChild(div);
          });
      } else {
          container.textContent = 'Failed to load Contacts.';
      }
  } catch (err) {
      console.error(err);
      document.getElementById('userList').textContent = 'Loading Contacts';
  }
}

fetchUsers();