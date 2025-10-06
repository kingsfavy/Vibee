        // Fetch the user's profile information from the API
        async function fetchProfile() {
            try {
              const res = await fetch('/api/profile');
              if (res.ok) {
                const data = await res.json();
                document.getElementById('userInfo').textContent = data.user.username;
                document.getElementById('namee').textContent = data.user.yourname;
                document.getElementById('email').textContent =  data.user.email;
             
              } else {
                document.getElementById('userInfo').textContent = 'Loading profile data';
            
              }
            } catch (error) {
              document.getElementById('userInfo').textContent = 'Error fetching profile data';
              document.getElementById('email').textContent = 'Error fetching profile data';
              document.getElementById('namee').textContent = 'Error fetching profile data';
          
            }
          }
          fetchProfile();