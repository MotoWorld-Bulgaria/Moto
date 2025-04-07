import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDpJhUe5vwF7WRHCXzOlhqktZBazOwnU2E",
    authDomain: "moto-bcb2b.firebaseapp.com",
    projectId: "moto-bcb2b",
    storageBucket: "moto-bcb2b.firebasestorage.app",
    messagingSenderId: "57659561149",
    appId: "1:57659561149:web:bf9761ac7ecd001495d3d4",
    measurementId: "G-80J0MYRXBV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentlyEditing = null;

function createMotorCard(motor, motorId) {
    const isEditing = currentlyEditing === motorId;
    return `
        <div class="motor-item" data-id="${motorId}">
            <div class="motor-image-container">
                <img src="${motor.image || ''}" alt="${motor.name || ''}">
            </div>
            <div class="motor-content">
                <h3 class="motor-name">${motor.name || ''}</h3>
                <div class="motor-specs">
                    <div class="spec-item">
                        <span class="spec-label">Производител</span>
                        <span class="spec-value" ${isEditing ? 'contenteditable="true"' : ''}>${motor.manufacturer || ''}</span>
                    </div>
                    <div class="spec-item">
                        <span class="spec-label">Цена</span>
                        <span class="spec-value" ${isEditing ? 'contenteditable="true"' : ''}>${motor.price || ''} лв.</span>
                    </div>
                    <div class="spec-item">
                        <span class="spec-label">Мощност</span>
                        <span class="spec-value" ${isEditing ? 'contenteditable="true"' : ''}>${motor.horsepower || ''} к.с.</span>
                    </div>
                    <div class="spec-item">
                        <span class="spec-label">Макс. скорост</span>
                        <span class="spec-value" ${isEditing ? 'contenteditable="true"' : ''}>${motor.maxSpeed || ''} км/ч</span>
                    </div>
                </div>
                <div class="motor-actions">
                    <button class="${isEditing ? 'save-btn' : 'edit-btn'}" data-id="${motorId}">
                        ${isEditing ? 'Запази' : 'Редактирай'}
                    </button>
                    <button class="delete-btn" data-id="${motorId}">Изтрий</button>
                </div>
            </div>
        </div>
    `;
}

async function updateMotor(motorId, updatedData) {
    try {
        const motorRef = doc(db, 'motors', motorId);
        await updateDoc(motorRef, updatedData);
        currentlyEditing = null;
        await displayMotors();
    } catch (error) {
        console.error("Error updating motor:", error);
        alert("Грешка при обновяването на мотора");
    }
}

async function displayMotors() {
    const motorsGrid = document.querySelector('.motors-grid');
    const motorsCollection = collection(db, 'motors');
    const motorsSnapshot = await getDocs(motorsCollection);
    
    motorsGrid.innerHTML = ''; // Clear existing content
    
    motorsSnapshot.forEach((doc) => {
        const motor = doc.data();
        const motorId = doc.id;
        const motorCard = createMotorCard(motor, motorId);
        motorsGrid.innerHTML += motorCard;
    });

    // Add event listeners for buttons
    document.querySelectorAll('.edit-btn, .save-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const motorId = e.target.dataset.id;
            const motorCard = e.target.closest('.motor-item');
            
            if (e.target.classList.contains('edit-btn')) {
                // Enter edit mode
                currentlyEditing = motorId;
                await displayMotors();
            } else {
                // Save changes
                const updatedData = {
                    manufacturer: motorCard.querySelector('.spec-value').textContent.trim(),
                    price: motorCard.querySelectorAll('.spec-value')[1].textContent.replace(' лв.', '').trim(),
                    horsepower: motorCard.querySelectorAll('.spec-value')[2].textContent.replace(' к.с.', '').trim(),
                    maxSpeed: motorCard.querySelectorAll('.spec-value')[3].textContent.replace(' км/ч', '').trim()
                };
                await updateMotor(motorId, updatedData);
            }
        });
    });

    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const motorId = e.target.dataset.id;
            if (confirm('Сигурни ли сте, че искате да изтриете този мотор?')) {
                await deleteDoc(doc(db, 'motors', motorId));
                displayMotors(); // Refresh the list
            }
        });
    });
}

// Initialize the display when the page loads
document.addEventListener('DOMContentLoaded', () => {
    displayMotors();
});

// Form submission handling
document.getElementById('addMotorForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const motorData = {
        name: document.getElementById('name').value,
        manufacturer: document.getElementById('manufacturer').value,
        price: document.getElementById('price').value,
        maxSpeed: document.getElementById('maxSpeed').value,
        horsepower: document.getElementById('horsepower').value,
        torque: document.getElementById('torque').value,
        image: document.getElementById('image').value
    };

    await addDoc(collection(db, 'motors'), motorData);
    e.target.reset(); // Clear the form
    displayMotors(); // Refresh the list
});

// Burger menu functionality
document.addEventListener('DOMContentLoaded', () => {
    const burgerMenu = document.querySelector('.burger-menu');
    const burgerIcon = document.querySelector('.burger-icon');

    burgerIcon.addEventListener('click', () => {
        burgerMenu.classList.toggle('active');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!burgerMenu.contains(e.target) && burgerMenu.classList.contains('active')) {
            burgerMenu.classList.remove('active');
        }
    });
});
