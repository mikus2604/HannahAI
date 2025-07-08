// Test script to grant super user access
// This is a temporary test file to grant super user privileges

const grantSuperUser = async () => {
  try {
    const response = await fetch('https://idupowkqzcwrjslcixsp.supabase.co/functions/v1/grant-super-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'ariel.mikulski@gmail.com'
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success:', data.message);
      console.log('User ID:', data.user_id);
    } else {
      console.error('❌ Error:', data.error);
    }
  } catch (error) {
    console.error('❌ Network error:', error);
  }
};

// Call the function
grantSuperUser();

export {};