const sendbtn = document.getElementById('sendbtn')
const token = localStorage.getItem('token');
const inputBox = document.getElementById('comment')
const dummy = document.getElementById('dummy')
let remainingChat = []
let lastId = localStorage.getItem('lastId')
const form = document.getElementById('createGrpForm');
const usernewForm = document.getElementById('userAddForm')
const chatting = document.querySelector('.dummy');
const leftPnael = document.querySelector('.groupList')
let selectedGroupId;
let selectedUserId;

const socket = io();
socket.on('connect', _ => {
    console.log(`connected with ${socket.id}`)
});

socket.on('sent-msgs', (content) => {
    console.log(content);
    let user = parseJwt(token).name;
    if (content.format === 'image/jpeg') {
        dummy.innerHTML += `<div class="col-3 my-1 ">${user}<div class="mt-1 mb-3"><img src="${content.text}" alt="alt" width="200" height="200" class="rounded" /></div></div>`;
    } else {
        dummy.innerHTML += `<div class="col-3 my-1 ">${user} : ${content.text}`;
    }
});
async function sendMsg(grpId, e) {
    try {
        const text = inputBox.value
        console.log(text);
        const files = document.getElementById('files').files;
        console.log(files);
        const formData = new FormData();
        
        formData.set('text', text); 
        for(let i=0; i< files.length; i++){
            formData.append('files', files[i]);
        }
                                                                                
        const headers = {
            headers: {
                "Authorization": token,
                "Content-Type": "multipart/form-data"
            }
        };
        const { data } = await axios.post(`/group/newMsg?id=${grpId}`, formData, headers);
        console.log(formData); 
        console.log(data);
        inputBox.value = '';
        document.getElementById('files').value = '';

        data.forEach(chat => {
            socket.emit('new-msg', chat);
            
            let HTMLContent = `<div class="col-3 my-1 ms-auto">You : ${chat.text}`;
            
            if (chat.format === 'image/jpeg') {
                HTMLContent = `<div class='col-3 my-1 ms-auto'>You :<div class="mt-1 mb-3"><img src="${chat.text}" alt="alt" width="200" height="200" class="rounded" /></div></div>`;
            }
            
            dummy.innerHTML += HTMLContent;
        });
    }
    catch (err) {
        console.log(err);
    }
}

function parseJwt (token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

async function fetchChats(groupId, event) {
    try {
        sendbtn.setAttribute('onclick', `sendMsg(${groupId}, event)`);
        selectedGroupId = groupId;
        const response = await axios.get(`/group/grpChats/?id=${groupId}`, { headers: { "Authorization": token } });
        console.log(response.data.message)
        document.querySelector('.right').classList.remove('d-none');
        document.getElementById('grpName').textContent = event.target.parentNode.parentNode.id;
        console.log(event.target.parentNode.parentNode.id);
        dummy.innerHTML = '';
        let sender = parseJwt(token).userId;
        console.log(sender);
        let newMsg = response.data.chats;
        console.log(newMsg)
        newMsg.forEach(chat => {
            console.log(chat)
            let user = parseJwt(token).name;
            console.log(user);
            if (chat.userId === sender) {
                user = 'You';
            }
            let sideClass = user === 'You' ? "ms-auto" : "me-auto";

            let HTMLContent = `<div class="col-3 my-1 ${sideClass}">${user} : ${chat.text}</div>`;
            
            if (chat.format === 'image/jpeg') {
                HTMLContent = `<div class='col-3 my-1 ${sideClass}'>${user} :<div class="mt-1 mb-3"><img src="${chat.text}" alt="alt" width="200" height="200" class="rounded" /></div></div>`;
            }
            dummy.innerHTML += HTMLContent;
            
        });
    } catch (error) {
        if (error.response && error.response.status === 401) {
            alert("You aren't a participant of this group to view the messages!");
        } else {
            console.log(error);
        }
    }
}

 let createGrp = document.getElementById('createGrp');
createGrp.onclick = async () => {
    try {
        const { data } = await axios.get('/user/allusers', { headers: { "Authorization": token } });
        console.log(data);
        document.querySelector('.groupList2').classList.toggle('d-none');
        document.querySelector('.group').classList.toggle('d-none')
        const userList = document.querySelector('#userList');
        userList.innerHTML = '';

        data.forEach((user, index) => {
            userList.innerHTML += `<li class="list-group-item"><div class="form-check">
            <input class="form-check-input" type="checkbox" name="participant" id="${user.id}" value="${user.name}">
            <label class="form-check-label" for="${user.id}">${user.name}</label></div></li>`;
        })
    }
    catch (err) {
        console.log(err);
    }
}

// click on cross button
const cancelBtn = document.getElementById('cancel');
cancelBtn.onclick = (e) => {
    document.querySelector('.groupList2').classList.toggle('d-none');
    document.querySelector('.group').classList.toggle('d-none');
    showGrp();
}

const oldFormbtn = document.getElementById('create');
oldFormbtn.addEventListener('click', oldForm);


// click on create group submit button
async function oldForm(e) {
    try {
        e.preventDefault();
        console.log(e.target);
        const name = form.querySelector('#name').value;
        console.log(name);
        const members = [];
        let list = form.querySelectorAll('input[type="checkbox"]');
        console.log(list);
        list.forEach(item => { if (item.checked) members.push(item.value); });
        console.log(members);
        if (!members.length) {
            alert('Please select atleast one member to proceed!');
        }
        else {
            const groupDetails = {
                name, members
            }
            console.log(groupDetails);
            const { data } = await axios.post('/group/members', groupDetails, { headers: { "Authorization": token } });
            console.log(data);
            document.querySelector('.groupList2').classList.toggle('d-none');
            document.querySelector('.group').classList.toggle('d-none');
            showGrp();
        }
    }
    catch (err) {
        console.log(err);
    }
}

async function showGrp() {
    try {
        const response = await axios.get('/group/allGroup', { headers: { "Authorization": token } });
        const groupData = response.data;

        console.log(groupData);

        const ul = document.getElementById('grpList')
        ul.innerHTML = '';

        groupData.forEach(group => {
            socket.emit('join-group', group.id);
            console.log(group.id + ' groupid');
            ul.innerHTML += `<li class='list-group-item grouptitle' id='${group.name}' onclick='fetchChats(${group.id}, event)'>
                <div class='d-flex'><span class='text-size ms-2 me-4'><i class='bi bi-people'></i></span><h5>${group.name}</h5></div></li>`;
        });
    } catch (error) {
        console.error("Error fetching group data:", error);
    }
}

const threeDotsIcon = document.querySelector('.bi-three-dots-vertical');
threeDotsIcon.addEventListener('click', grpDetails)

async function grpDetails() {
    try {
        const response = await axios.get(`/group/reqGroup/${selectedGroupId}`, { headers: { "Authorization": token } });
        const groupData = response.data;

        console.log(typeof groupData);

        let div = document.getElementById('offcanvasExampleLabel');

        div.innerHTML = '';
        groupData.forEach(group => {
            console.log(group.id + ' groupid');
            div.innerHTML += `<div class='list-group-item' id='${group.name}'>
                <div class='d-flex'><span class='text-size ms-3 me-4'><i class='bi bi-people'></i></span><h3>${group.name}</h3></div></div>`;
        });
        grpUserDetails()
    } catch (error) {
        console.log(error);
    }
}

async function grpUserDetails() {
    try {
        const result = await axios.get(`/group/allUser?id=${selectedGroupId}`, { headers: { "Authorization": token } });
        let userData = result.data.member
        console.log(result);

        let ul = document.querySelector('.offcanvas-ul');
        ul.innerHTML = '';

        userData.forEach(user => {
            selectedUserId = user.id;

            let li = document.createElement('li');
            li.classList.add('offcanvas-li');
            li.innerHTML = `<div class="d-flex justify-content-between align-items-center id="${user.id}">
                                <div>${user.name} - ${user.isAdmin ? 'Admin' : 'Member'}</div>
                                    <div class="btn-group dropstart">
                                        <button class="btn btn-secondary btn-sm dropdown-toggle" type="button"
                                            id="dropdownMenuButton" data-bs-toggle="dropdown" aria-expanded="false">
                                        </button>
    
                                        <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton">
                                            <li class="dropdown-item" id="${user.id}" onclick="removeUser(${user.id})"> Remove-User </li>
                                            <li class="dropdown-item" id="${user.id}" onclick="addAdmin(${user.id})"> Add-Admin </li>
                                        </ul>
                                    </div>
                            </div>`;
            ul.appendChild(li);
        });
    }
    catch (error) {
        console.log(error);
    }
}

const addUserItem = document.getElementById('addUserButton');
addUserItem.addEventListener('click', () => addUser());

async function addUser() {
    try {
        console.log(selectedGroupId);
        const result = await axios.get(`/user/newUsers?id=${selectedGroupId}`, { headers: { "Authorization": token } });
        console.log(result.data);
        document.querySelector('.newGroupList').classList.toggle('d-none');
        const userList = document.querySelector('#newUserList');
        userList.innerHTML = "";

        result.data.nonGroupMembers.forEach((user, index) => {
            userList.innerHTML += `<li class="list-group-item"><div class="form-check">
            <input class="form-check-input" type="checkbox" name="participant" id="${user.id}" value="${user.name}">
            <label class="form-check-label" for="${user.id}">${user.name}</label></div></li>`;
        })
    }
    catch (err) {
        console.log(err)
    }
}

const addNewUserbtn = document.getElementById('addUser');
addNewUserbtn.addEventListener('click', newFormSubmit);

async function newFormSubmit(e) {
    try {
        e.preventDefault();
        console.log(e.target);
        const newMembers = [];
        let userlist = usernewForm.querySelectorAll('input[type="checkbox"]');
        console.log(userlist);
        userlist.forEach(item => { if (item.checked) newMembers.push(item.value); });
        console.log(newMembers);
        
        const groupDts = {
            members: newMembers
        }

        const { data } = await axios.post(`/group/member?id=${selectedGroupId}`, groupDts, { headers: { "Authorization": token } });
        console.log(data);
        document.querySelector('.newGroupList').classList.toggle('d-none');
        grpUserDetails();
    }
    catch (err) {
        console.log(err);
    }
}

const formCancelBtn = document.getElementById('newCancel');
formCancelBtn.onclick = (e) => {
    document.querySelector('.newGroupList').classList.toggle('d-none');
}

async function removeUser(selectedUserId) {
    try {
        console.log(selectedUserId)
        const { data } = await axios.get(`/user/${selectedUserId}?id=${selectedGroupId}`, { headers: { "Authorization": token } });
        console.log(data);
        grpUserDetails();
    } catch (error) {
        console.log(error);
    }
}

async function addAdmin(selectedUserId) {
    try {
        const result = await axios.get(`/group/${selectedUserId}?id=${selectedGroupId}`, { headers: { "Authorization": token } });
        console.log(result.data);
        grpUserDetails()
    }
    catch (err) {
        console.log(err);
    }
}

document.getElementById('logoutbtn').onclick = () => {
    window.location.href = '../views/login.html';
    localStorage.removeItem('token');
}

window.addEventListener('DOMContentLoaded', async () => {
    showGrp();
});


