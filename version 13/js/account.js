import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDpJhUe5vwF7WRHCXzOlhqktZBazOwnU2E",
    authDomain: "moto-bcb2b.firebaseapp.com",
    projectId: "moto-bcb2b",
    storageBucket: "moto-bcb2b.appspot.com",
    messagingSenderId: "57659561149",
    appId: "1:57659561149:web:bf9761ac7ecd001495d3d4",
    measurementId: "G-80J0MYRXBV"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;

// Initialize user data
auth.onAuthStateChanged(async (user) => {
    if (user) {
        try {
            currentUser = user;
            const userDocRef = doc(db, "users", user.uid);
            
            // Get user data first
            const userDoc = await getDoc(userDocRef);
            
            // If user document doesn't exist, create it
            if (!userDoc.exists()) {
                try {
                    await setDoc(userDocRef, {
                        email: user.email,
                        createdAt: new Date().toISOString(),
                        displayName: user.displayName || 'New User',
                        photoURL: 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'
                    });
                    
                    // Fetch the newly created document
                    const newUserDoc = await getDoc(userDocRef);
                    updateUI(newUserDoc.data());
                } catch (error) {
                    console.error("Error creating user document:", error);
                    alert("Error creating user profile. Please try again.");
                }
            } else {
                // Update UI with existing user data
                updateUI(userDoc.data());
            }
            
            // Load user's orders
            await loadUserOrders(user.uid);
        } catch (error) {
            console.error("Error loading user data:", error);
            alert("Error loading user data. Please refresh the page.");
        }
    } else {
        window.location.href = 'login.html';
    }
});

// Helper function to update UI
function updateUI(userData) {
    if (!userData) return;
    
    document.getElementById('displayName').innerHTML = `<span class="greeting">Здравей, </span><span class="name">${userData.displayName || 'New User'}</span>`;
    document.getElementById('nameInput').value = userData.displayName || '';
    document.getElementById('firstNameInput').value = userData.firstName || '';
    document.getElementById('lastNameInput').value = userData.lastName || '';
    document.getElementById('userEmail').textContent = currentUser.email;
    document.getElementById('ageInput').value = userData.age || '';
    document.getElementById('joinDate').textContent = new Date(currentUser.metadata.creationTime).toLocaleDateString();
    document.getElementById('profileImage').src = userData.photoURL || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
}

// Update image URL section toggle
document.getElementById('editImageBtn').addEventListener('click', () => {
    const section = document.getElementById('imageUrlSection');
    const btn = document.getElementById('editImageBtn');
    if (section.style.display === 'none' || !section.style.display) {
        section.style.display = 'block';
        btn.innerHTML = '<i class="fas fa-times"></i> Cancel';
    } else {
        section.style.display = 'none';
        btn.innerHTML = '<i class="fas fa-image"></i> Change Profile Picture';
        document.getElementById('imageUrlInput').value = '';
    }
});

// Update image save handler
document.getElementById('saveImageBtn').addEventListener('click', async () => {
    const imageUrl = document.getElementById('imageUrlInput').value.trim();
    if (!imageUrl) {
        alert("Моля, въведете валиден URL на снимка");
        return;
    }

    try {
        new URL(imageUrl);
        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, {
            photoURL: imageUrl
        });

        document.getElementById('profileImage').src = imageUrl;
        document.getElementById('imageUrlInput').value = '';
        document.getElementById('imageUrlSection').style.display = 'none';
        document.getElementById('editImageBtn').innerHTML = '<i class="fas fa-image"></i> Change Profile Picture';
        alert("Профилната снимка е обновена успешно!");
    } catch (error) {
        console.error("Error updating profile picture:", error);
        alert("Моля, въведете валиден URL на снимка");
    }
});

// Handle name update
document.getElementById('saveNameBtn').addEventListener('click', async () => {
    const input = document.getElementById('nameInput');
    const saveBtn = document.getElementById('saveNameBtn');
    const newName = input.value.trim();
    
    if (!newName) {
        alert("Моля, въведете валидно име");
        return;
    }

    try {
        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, {
            displayName: newName
        });
        document.getElementById('displayName').textContent = newName;
        input.classList.remove('editable');
        input.setAttribute('readonly', true);
        saveBtn.classList.remove('show');
        alert("Името е обновено успешно!");
    } catch (error) {
        console.error("Error updating name:", error);
        alert("Грешка при обновяване на името. Моля, опитайте отново.");
    }
});

// Handle age update
document.getElementById('saveAgeBtn').addEventListener('click', async () => {
    const input = document.getElementById('ageInput');
    const saveBtn = document.getElementById('saveAgeBtn');
    const newAge = parseInt(input.value);
    
    if (!newAge || newAge < 16 || newAge > 120) {
        alert("Please enter a valid age between 16 and 120");
        return;
    }

    try {
        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, {
            age: newAge
        });
        input.classList.remove('editable');
        input.setAttribute('readonly', true);
        saveBtn.classList.remove('show');
        alert("Age updated successfully!");
    } catch (error) {
        console.error("Error updating age:", error);
        alert("Failed to update age. Please try again.");
    }
});

// Add edit mode handlers
document.getElementById('editNameBtn').addEventListener('click', () => {
    const input = document.getElementById('nameInput');
    const saveBtn = document.getElementById('saveNameBtn');
    input.classList.add('editable');
    input.removeAttribute('readonly');
    input.focus();
    saveBtn.classList.add('show');
});

document.getElementById('editAgeBtn').addEventListener('click', () => {
    const input = document.getElementById('ageInput');
    const saveBtn = document.getElementById('saveAgeBtn');
    input.classList.add('editable');
    input.removeAttribute('readonly');
    input.focus();
    saveBtn.classList.add('show');
});

// Add handlers for first name
document.getElementById('editFirstNameBtn').addEventListener('click', () => {
    const input = document.getElementById('firstNameInput');
    const saveBtn = document.getElementById('saveFirstNameBtn');
    input.classList.add('editable');
    input.removeAttribute('readonly');
    input.focus();
    saveBtn.classList.add('show');
});

document.getElementById('saveFirstNameBtn').addEventListener('click', async () => {
    const input = document.getElementById('firstNameInput');
    const saveBtn = document.getElementById('saveFirstNameBtn');
    const newFirstName = input.value.trim();
    
    if (!newFirstName) {
        alert("Please enter a valid first name");
        return;
    }

    try {
        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, {
            firstName: newFirstName
        });
        input.classList.remove('editable');
        input.setAttribute('readonly', true);
        saveBtn.classList.remove('show');
        alert("First name updated successfully!");
    } catch (error) {
        console.error("Error updating first name:", error);
        alert("Failed to update first name. Please try again.");
    }
});

// Add handlers for last name
document.getElementById('editLastNameBtn').addEventListener('click', () => {
    const input = document.getElementById('lastNameInput');
    const saveBtn = document.getElementById('saveLastNameBtn');
    input.classList.add('editable');
    input.removeAttribute('readonly');
    input.focus();
    saveBtn.classList.add('show');
});

document.getElementById('saveLastNameBtn').addEventListener('click', async () => {
    const input = document.getElementById('lastNameInput');
    const saveBtn = document.getElementById('saveLastNameBtn');
    const newLastName = input.value.trim();
    
    if (!newLastName) {
        alert("Please enter a valid last name");
        return;
    }

    try {
        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, {
            lastName: newLastName
        });
        input.classList.remove('editable');
        input.setAttribute('readonly', true);
        saveBtn.classList.remove('show');
        alert("Last name updated successfully!");
    } catch (error) {
        console.error("Error updating last name:", error);
        alert("Failed to update last name. Please try again.");
    }
});

// Remove the old password change handler
// document.getElementById('changePasswordBtn').addEventListener('click', async () => { ... });

// Update image edit handlers
document.getElementById('editImageBtn').addEventListener('click', () => {
    document.getElementById('editImageBtn').style.display = 'none';
    document.getElementById('imageEditForm').style.display = 'block';
    document.getElementById('imageUrlInput').focus();
});

document.getElementById('cancelImageBtn').addEventListener('click', () => {
    document.getElementById('imageEditForm').style.display = 'none';
    document.getElementById('editImageBtn').style.display = 'flex';
    document.getElementById('imageUrlInput').value = '';
});

document.getElementById('saveImageBtn').addEventListener('click', async () => {
    const imageUrl = document.getElementById('imageUrlInput').value.trim();
    if (!imageUrl) {
        alert("Моля, въведете валиден URL на снимка");
        return;
    }

    try {
        new URL(imageUrl);
        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, {
            photoURL: imageUrl
        });

        document.getElementById('profileImage').src = imageUrl;
        document.getElementById('imageUrlInput').value = '';
        document.getElementById('imageEditForm').style.display = 'none';
        document.getElementById('editImageBtn').style.display = 'flex';
        alert("Профилната снимка е обновена успешно!");
    } catch (error) {
        console.error("Error updating profile picture:", error);
        alert("Моля, въведете валиден URL на снимка");
    }
});

document.getElementById('editImageBtn').addEventListener('click', () => {
    const section = document.getElementById('imageUrlSection');
    section.classList.toggle('show');
});

// Helper function to handle edit mode
function enableEditMode(input, saveBtn, cancelBtn, originalValue) {
    input.classList.add('editable');
    input.removeAttribute('readonly');
    input.dataset.originalValue = originalValue; // Store original value
    input.focus();
}

// Helper function to handle cancel
function cancelEdit(input, saveBtn, cancelBtn) {
    input.value = input.dataset.originalValue; // Restore original value
    input.classList.remove('editable');
    input.setAttribute('readonly', true);
    saveBtn.classList.remove('show');
    cancelBtn.classList.remove('show');
}

// Update name edit handlers
document.getElementById('editNameBtn').addEventListener('click', () => {
    const input = document.getElementById('nameInput');
    const saveBtn = document.getElementById('saveNameBtn');
    const cancelBtn = document.getElementById('cancelNameBtn');
    enableEditMode(input, saveBtn, cancelBtn, input.value);
});

document.getElementById('cancelNameBtn').addEventListener('click', () => {
    const input = document.getElementById('nameInput');
    const saveBtn = document.getElementById('saveNameBtn');
    const cancelBtn = document.getElementById('cancelNameBtn');
    cancelEdit(input, saveBtn, cancelBtn);
});

// Update first name edit handlers
document.getElementById('editFirstNameBtn').addEventListener('click', () => {
    const input = document.getElementById('firstNameInput');
    const saveBtn = document.getElementById('saveFirstNameBtn');
    const cancelBtn = document.getElementById('cancelFirstNameBtn');
    enableEditMode(input, saveBtn, cancelBtn, input.value);
});

document.getElementById('cancelFirstNameBtn').addEventListener('click', () => {
    const input = document.getElementById('firstNameInput');
    const saveBtn = document.getElementById('saveFirstNameBtn');
    const cancelBtn = document.getElementById('cancelFirstNameBtn');
    cancelEdit(input, saveBtn, cancelBtn);
});

// Update last name edit handlers
document.getElementById('editLastNameBtn').addEventListener('click', () => {
    const input = document.getElementById('lastNameInput');
    const saveBtn = document.getElementById('saveLastNameBtn');
    const cancelBtn = document.getElementById('cancelLastNameBtn');
    enableEditMode(input, saveBtn, cancelBtn, input.value);
});

document.getElementById('cancelLastNameBtn').addEventListener('click', () => {
    const input = document.getElementById('lastNameInput');
    const saveBtn = document.getElementById('saveLastNameBtn');
    const cancelBtn = document.getElementById('cancelLastNameBtn');
    cancelEdit(input, saveBtn, cancelBtn);
});

// Update age edit handlers
document.getElementById('editAgeBtn').addEventListener('click', () => {
    const input = document.getElementById('ageInput');
    const saveBtn = document.getElementById('saveAgeBtn');
    const cancelBtn = document.getElementById('cancelAgeBtn');
    enableEditMode(input, saveBtn, cancelBtn, input.value);
});

document.getElementById('cancelAgeBtn').addEventListener('click', () => {
    const input = document.getElementById('ageInput');
    const saveBtn = document.getElementById('saveAgeBtn');
    const cancelBtn = document.getElementById('cancelAgeBtn');
    cancelEdit(input, saveBtn, cancelBtn);
});

// Връщане към оригиналната функция за зареждане на поръчки
async function loadUserOrders(userId) {
    const ordersList = document.getElementById('ordersList');
    
    try {
        const ordersQuery = query(
            collection(db, "orders"),
            where("customer.uid", "==", userId)
        );
        
        const ordersSnapshot = await getDocs(ordersQuery);
        
        if (ordersSnapshot.empty) {
            ordersList.innerHTML = '<div class="no-orders">Все още няма поръчки</div>';
            return;
        }

        let ordersHTML = '';
        ordersSnapshot.forEach((doc) => {
            const order = doc.data();
            const product = order.productDetails || {};
            
            ordersHTML += `
                <div class="order-card" onclick="showOrderModal('${doc.id}')">
                    <div class="order-main-info">
                        <span class="order-number">Поръчка #${order.orderNumber || 'N/A'}</span>
                        <span class="order-status ${order.status}">${getStatusText(order.status)}</span>
                    </div>
                    <div class="order-brief">
                        <span class="order-product-name">${product.name || 'Неизвестен продукт'}</span>
                        <span class="order-price">${product.price || '0'} лв.</span>
                    </div>
                </div>
            `;
        });
        
        ordersList.innerHTML = ordersHTML;

        // Add modal container if it doesn't exist
        if (!document.getElementById('orderModal')) {
            const modalHTML = `
                <div id="orderModal" class="order-modal">
                    <div class="order-modal-content">
                        <div class="modal-header">
                            <h2>Детайли на поръчката</h2>
                            <button type="button" class="close-modal" aria-label="Close">&times;</button>
                        </div>
                        <div id="modalContent" class="modal-body"></div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            // Update event listeners for modal closing
            const modal = document.getElementById('orderModal');
            const closeBtn = modal.querySelector('.close-modal');
            
            closeBtn.addEventListener('click', () => {
                closeOrderModal();
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeOrderModal();
                }
            });
            
            // Prevent clicks inside modal content from closing the modal
            modal.querySelector('.order-modal-content').addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    } catch (error) {
        console.error("Error loading orders:", error);
        ordersList.innerHTML = '<div class="no-orders">Грешка при зареждане на поръчките</div>';
    }
}

// Add these new functions for modal handling
window.showOrderModal = async (orderId) => {
    const modal = document.getElementById('orderModal');
    const modalContent = document.getElementById('modalContent');
    
    try {
        const orderDoc = await getDoc(doc(db, "orders", orderId));
        const order = orderDoc.data();
        const product = order.productDetails || {};
        const orderDate = order.createdAt?.toDate?.() || new Date(order.createdAt);
        
        modalContent.innerHTML = `
            <div class="order-details-grid">
                <div class="product-section">
                    <img src="${product.image || ''}" alt="${product.name}" class="product-image">
                    <div class="product-info">
                        <div class="product-specs">
                            <div class="spec-row">
                                <span class="spec-label">Марка:</span>
                                <span class="spec-value">${product.manufacturer || 'Неизвестна'}</span>
                            </div>
                            <div class="spec-row">
                                <span class="spec-label">Модел:</span>
                                <span class="spec-value">${product.name || 'Неизвестен'}</span>
                            </div>
                            <div class="spec-row">
                                <span class="spec-label">Цена:</span>
                                <span class="spec-value price-value">${product.price || '0'} лв.</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="order-info-section">
                    <div class="info-row">
                        <span class="info-label">Номер на поръчка:</span>
                        <span class="info-value">#${order.orderNumber || 'N/A'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Дата на поръчка:</span>
                        <span class="info-value">${orderDate.toLocaleDateString('bg-BG')}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Статус:</span>
                        <span class="info-value status ${order.status}">${getStatusText(order.status)}</span>
                    </div>
                </div>
            </div>
        `;
        
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    } catch (error) {
        console.error("Error loading order details:", error);
        alert("Грешка при зареждане на детайлите на поръчката");
    }
};

window.closeOrderModal = () => {
    const modal = document.getElementById('orderModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
};

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    const modal = document.getElementById('orderModal');
    if (event.target === modal) {
        closeOrderModal();
    }
});

// Затваряне при клик извън детайлите
document.addEventListener('click', (e) => {
    const overlay = document.getElementById('orderOverlay');
    if (e.target === overlay) {
        hideOrderOverlay();
    }
});

// Добавяме нова функция за превключване на детайлите
window.toggleOrderDetails = (card) => {
    // Затваряме всички други отворени карти
    document.querySelectorAll('.order-card.expanded').forEach(openCard => {
        if (openCard !== card) {
            openCard.classList.remove('expanded');
        }
    });
    
    // Превключваме текущата карта
    card.classList.toggle('expanded');
};

// Добавяме функцията getStatusText
function getStatusText(status) {
    const statusMap = {
        'pending': 'В обработка',
        'completed': 'Завършена',
        'cancelled': 'Отказана',
        'processing': 'Обработва се',
        'shipped': 'Изпратена',
        'delivered': 'Доставена'
    };
    return statusMap[status] || 'Неизвестен';
}

// Добавяме функции за работа с модалния прозорец
window.showOrderDetails = async (orderId) => {
    const orderModal = document.getElementById('orderModal');
    const modalContent = document.getElementById('modalContent');
    
    try {
        const orderDoc = await getDoc(doc(db, "orders", orderId));
        const order = orderDoc.data();
        const product = order.productDetails || {};
        const orderDate = order.createdAt?.toDate?.() || new Date(order.createdAt);
        
        modalContent.innerHTML = `
            <div class="detail-group">
                <span class="detail-label">Поръчка #</span>
                <span class="detail-value">${order.orderNumber || 'N/A'}</span>
            </div>
            <div class="detail-group">
                <span class="detail-label">Дата</span>
                <span class="detail-value">${orderDate.toLocaleDateString('bg-BG')}</span>
            </div>
            <div class="detail-group">
                <span class="detail-label">Статус</span>
                <span class="status-badge status-${order.status}">${getStatusText(order.status)}</span>
            </div>
            <div class="detail-group">
                <span class="detail-label">Продукт</span>
                <span class="detail-value">${product.name}</span>
            </div>
            <div class="detail-group">
                <span class="detail-label">Цена</span>
                <span class="detail-value">${product.price} лв.</span>
            </div>
        `;
        
        orderModal.classList.add('active');
    } catch (error) {
        console.error("Error loading order details:", error);
        alert("Грешка при зареждане на детайлите");
    }
};

window.closeOrderModal = () => {
    const orderModal = document.getElementById('orderModal');
    orderModal.classList.remove('active');
};

// Затваряне на модала при клик извън него
document.addEventListener('click', (e) => {
    const orderModal = document.getElementById('orderModal');
    if (e.target === orderModal) {
        closeOrderModal();
    }
});

function getOrderStatusBadge(status) {
    const statusMap = {
        'pending': ['В обработка', 'status-pending'],
        'completed': ['Завършена', 'status-completed'],
        'cancelled': ['Отказана', 'status-cancelled']
    };
    
    const [text, className] = statusMap[status] || ['Неизвестен', ''];
    return `<span class="order-status ${className}">${text}</span>`;
}

// Update the closeOrderModal function to be more robust
function closeOrderModal() {
    const modal = document.getElementById('orderModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = ''; // Restore scrolling
    }
}

// Add event listener for the close button when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            closeOrderModal();
        });
    }

    // Also add click event for closing when clicking outside the modal
    const modal = document.getElementById('orderModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeOrderModal();
            }
        });
    }
});

// Remove the old modal click event listener since we're now handling it in DOMContentLoaded
// ...existing code...
