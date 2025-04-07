// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDpJhUe5vwF7WRHCXzOlhqktZBazOwnU2E",
  authDomain: "moto-bcb2b.firebaseapp.com",
  projectId: "moto-bcb2b",
  storageBucket: "moto-bcb2b.firebasestorage.app",
  messagingSenderId: "57659561149",
  appId: "1:57659561149:web:bf9761ac7ecd001495d3d4",
  measurementId: "G-80J0MYRXBV"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Check authentication state before fetching orders
function checkAuth() {
    return new Promise((resolve, reject) => {
        auth.onAuthStateChanged((user) => {
            if (user) {
                resolve(user);
            } else {
                window.location.href = 'login.html';
                reject('User not authenticated');
            }
        });
    });
}

// Helper function to get status text
function getStatusText(status) {
    const statusMap = {
        'pending': 'В очакване',
        'processing': 'В обработка',
        'completed': 'Завършена'
    };
    return statusMap[status] || status;
}

// Function to fetch all orders
async function fetchOrders() {
    try {
        await checkAuth();
        const snapshot = await db.collection('orders').get();
        const orders = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Add the document ID to the order data
            orders.push({
                id: doc.id,
                ...data,
                // Ensure orderDate is properly formatted even if it's a timestamp or string
                orderDate: data.orderDate || data.createdAt || new Date()
            });
        });
        console.log('Fetched orders:', orders); // Debug log
        return orders;
    } catch (error) {
        console.error("Error fetching orders: ", error);
        throw error;
    }
}

// Helper function to format date safely
function formatDate(dateValue) {
    if (!dateValue) return 'Няма дата';
    
    try {
        // Handle Firestore Timestamp
        if (dateValue.seconds) {
            return new Date(dateValue.seconds * 1000).toLocaleDateString('bg-BG');
        }
        // Handle regular Date object or string
        return new Date(dateValue).toLocaleDateString('bg-BG');
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Невалидна дата';
    }
}

// Function to update order status
async function updateOrderStatus(orderId, newStatus) {
    try {
        await db.collection('orders').doc(orderId).update({
            status: newStatus
        });
        return true;
    } catch (error) {
        console.error("Error updating order: ", error);
        throw error;
    }
}

// Function to delete order
async function deleteOrder(orderId) {
    try {
        await db.collection('orders').doc(orderId).delete();
        return true;
    } catch (error) {
        console.error("Error deleting order: ", error);
        throw error;
    }
}

// Function to render orders in the UI
function renderOrders(orders) {
    const container = document.getElementById('ordersContainer');
    container.innerHTML = '';

    orders.forEach(order => {
        const orderElement = createOrderElement(order);
        container.appendChild(orderElement);
    });
}

// Helper function to create order HTML element
function createOrderElement(order) {
    const div = document.createElement('div');
    div.className = 'order';
    
    // Safely get nested values
    const productName = order.productDetails?.name || 'Няма име';
    const manufacturer = order.productDetails?.manufacturer || 'Няма производител';
    const price = order.productDetails?.price || 'Няма цена';
    const email = order.customer?.email || order.email || 'Няма имейл';
    const status = order.status || 'pending';
    const orderNumber = order.orderNumber || order.id || 'Няма номер';

    div.innerHTML = `
        <div class="order-top">
            <h3>Поръчка #${orderNumber}</h3>
            <span class="status ${status}">${getStatusText(status)}</span>
        </div>
        <div class="order-content">
            <div class="order-info">
                <p><strong>Мотор:</strong> ${productName}</p>
                <p><strong>Производител:</strong> ${manufacturer}</p>
                <p><strong>Клиент:</strong> ${email}</p>
                <p><strong>Дата:</strong> ${formatDate(order.orderDate)}</p>
                <p class="price">${price} лв.</p>
            </div>
            <div class="order-actions">
                <div class="status-control">
                    <button class="status-btn" data-order-id="${order.id}">Промяна на статус</button>
                    <div class="status-menu">
                        <button class="status-option" data-status="pending">В очакване</button>
                        <button class="status-option" data-status="processing">В обработка</button>
                        <button class="status-option" data-status="completed">Завършена</button>
                    </div>
                </div>
                <button class="btn-delete" data-order-id="${order.id}">Изтриване</button>
            </div>
        </div>
    `;
    return div;
}

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await checkAuth(); // Check authentication first
        const orders = await fetchOrders();
        renderOrders(orders);

        // Setup event listeners
        document.addEventListener('click', async (e) => {
            // Handle status button click
            if (e.target.classList.contains('status-btn')) {
                const statusMenu = e.target.nextElementSibling;
                document.querySelectorAll('.status-menu.active').forEach(menu => {
                    if (menu !== statusMenu) menu.classList.remove('active');
                });
                statusMenu.classList.toggle('active');
            }

            // Handle status option click
            if (e.target.classList.contains('status-option')) {
                const orderId = e.target.closest('.order-actions').querySelector('.status-btn').dataset.orderId;
                const newStatus = e.target.dataset.status;
                try {
                    await updateOrderStatus(orderId, newStatus);
                    const orders = await fetchOrders();
                    renderOrders(orders);
                } catch (error) {
                    alert('Грешка при обновяване на статуса');
                }
            }

            // Handle delete button click
            if (e.target.classList.contains('btn-delete')) {
                const orderId = e.target.dataset.orderId;
                if (confirm('Сигурни ли сте, че искате да изтриете тази поръчка?')) {
                    try {
                        await deleteOrder(orderId);
                        const orders = await fetchOrders();
                        renderOrders(orders);
                    } catch (error) {
                        alert('Грешка при изтриване на поръчката');
                    }
                }
            }
        });

        // Setup search functionality
        document.getElementById('searchOrder').addEventListener('input', async (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const orders = await fetchOrders();
            const filteredOrders = orders.filter(order => 
                order.customer.email.toLowerCase().includes(searchTerm) ||
                order.productDetails.name.toLowerCase().includes(searchTerm) ||
                order.orderNumber?.toLowerCase().includes(searchTerm) ||
                order.id.toLowerCase().includes(searchTerm)
            );
            renderOrders(filteredOrders);
        });

        // Setup status filter
        document.getElementById('orderStatus').addEventListener('change', async (e) => {
            const status = e.target.value;
            const orders = await fetchOrders();
            const filteredOrders = status === 'all' ? 
                orders : 
                orders.filter(order => order.status === status);
            renderOrders(filteredOrders);
        });
    } catch (error) {
        console.error("Error initializing page: ", error);
        if (error === 'User not authenticated') {
            window.location.href = 'login.html';
        } else {
            alert('Грешка при зареждане на поръчките');
        }
    }
});
