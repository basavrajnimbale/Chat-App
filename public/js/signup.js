const formSubmit = document.getElementById('signup-form');
formSubmit.addEventListener('submit', signup);

async function signup(e) {
    try {
        e.preventDefault();

        const signupDetails = {
            name: e.target.name.value,
            email: e.target.email.value,
            phonenumber: e.target.phonenumber.value,
            password: e.target.password.value
        };

        const response = await axios.post('/user/signup', signupDetails);
        if(response.status === 201){
            alert('Successfully signed up!');
            window.location.href = "/views/login.html"
        } else {
            throw new Error('Failed to signup');
        }
        console.log(response);
        formSubmit.reset();


    } catch (err) {
        if (err.response && err.response.status === 409) {
            document.body.innerHTML += `<div style="color:red;">User already exists, Please Login</div>`;
        } else {
            document.body.innerHTML += `<div style="color:red;">${err}</div>`;
        }
    }
}
