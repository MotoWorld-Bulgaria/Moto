import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

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
const auth = getAuth(app);
const db = getFirestore(app);

// Enhanced display username in navbar
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userEmailElement = document.getElementById('userEmail');
    
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        // Display name with truncation if needed
        const displayText = userData.displayName || user.email;
        const truncatedText = displayText.length > 20 
          ? displayText.substring(0, 17) + '...' 
          : displayText;
        userEmailElement.textContent = truncatedText;
        // Add title attribute for full text on hover
        userEmailElement.setAttribute('title', displayText);
      } else {
        const truncatedEmail = user.email.length > 20 
          ? user.email.substring(0, 17) + '...' 
          : user.email;
        userEmailElement.textContent = truncatedEmail;
        userEmailElement.setAttribute('title', user.email);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      userEmailElement.textContent = 'User';
    }

    // Show admin link if user ID matches
    if (user.uid === 'ZXduWaLnwuVPlKPvZm0FyoDeaXs2') {
      document.getElementById('adminLink').style.display = 'block';
    }
  } else {
    window.location.href = 'index.html'; // Redirect to index.html if not logged in
  }
});

// Handle logout
document.getElementById('logoutLink').addEventListener('click', (e) => {
  e.preventDefault();
  signOut(auth).then(() => {
    window.location.href = 'index.html'; // Redirect to index.html after logout
  }).catch((error) => {
    console.error('Error signing out:', error);
  });
});

// Store all motors globally
let allMotors = [];

// Fetch and Display Motors with Filtering and Sorting
async function displayMotorsOnLogin() {
    try {
        const motorsRef = collection(db, "motors");
        const snapshot = await getDocs(motorsRef);
        allMotors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const manufacturerFilter = document.getElementById('manufacturerFilter');
        if (!manufacturerFilter) {
            console.error('Manufacturer filter element not found');
            return;
        }

        // Clear existing options first
        manufacturerFilter.innerHTML = '<option value="">Всички производители</option>';
        
        // Populate manufacturer filter
        const manufacturers = [...new Set(allMotors.map(motor => motor.manufacturer))].sort();
        manufacturers.forEach(manufacturer => {
            if (manufacturer) {  // Check for null/undefined manufacturers
                const option = document.createElement('option');
                option.value = manufacturer;
                option.textContent = manufacturer;
                manufacturerFilter.appendChild(option);
            }
        });

        // Initial display
        filterAndDisplayMotors();
    } catch (error) {
        console.error('Error loading motors:', error);
        const motorsContainer = document.getElementById("motorsContainer");
        if (motorsContainer) {
            motorsContainer.innerHTML = '<p class="error">Грешка при зареждане на моторите.</p>';
        }
    }
}

function filterAndDisplayMotors() {
    try {
        const manufacturer = document.getElementById('manufacturerFilter')?.value || '';
        const minPrice = document.getElementById('minPrice')?.value || '';
        const maxPrice = document.getElementById('maxPrice')?.value || '';
        const power = document.getElementById('powerFilter')?.value || '';
        const speed = document.getElementById('speedFilter')?.value || '';
        const sortOption = document.getElementById('sortOption')?.value || 'default';

        let filteredMotors = [...allMotors];

        // Apply filters
        if (manufacturer) {
            filteredMotors = filteredMotors.filter(motor => motor.manufacturer === manufacturer);
        }
        if (minPrice) {
            filteredMotors = filteredMotors.filter(motor => {
                // Convert price string to number by removing 'BGN' and parsing
                const motorPrice = parseFloat(motor.price.replace(/[^\d.]/g, ''));
                return motorPrice >= parseFloat(minPrice);
            });
        }
        if (maxPrice) {
            filteredMotors = filteredMotors.filter(motor => {
                const motorPrice = parseFloat(motor.price.replace(/[^\d.]/g, ''));
                return motorPrice <= parseFloat(maxPrice);
            });
        }
        if (power) {
            const powerNum = parseInt(power);
            if (powerNum === 301) {
                filteredMotors = filteredMotors.filter(motor => motor.horsepower > 300);
            } else {
                filteredMotors = filteredMotors.filter(motor => motor.horsepower <= powerNum);
            }
        }
        if (speed) {
            const speedNum = parseInt(speed);
            if (speedNum === 251) {
                filteredMotors = filteredMotors.filter(motor => motor.maxSpeed > 250);
            } else {
                filteredMotors = filteredMotors.filter(motor => motor.maxSpeed <= speedNum);
            }
        }

        // Parse price for sorting and filtering
        filteredMotors = filteredMotors.map(motor => ({
            ...motor,
            numericPrice: parseFloat(motor.price.replace(/[^\d.]/g, '')) // Remove non-numeric characters except decimal point
        }));

        // Apply sorting
        switch(sortOption) {
            case 'nameAsc':
                filteredMotors.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'nameDesc':
                filteredMotors.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'priceAsc':
                filteredMotors.sort((a, b) => a.numericPrice - b.numericPrice);
                break;
            case 'priceDesc':
                filteredMotors.sort((a, b) => b.numericPrice - a.numericPrice);
                break;
            case 'powerAsc':
                filteredMotors.sort((a, b) => a.horsepower - b.horsepower);
                break;
            case 'powerDesc':
                filteredMotors.sort((a, b) => b.horsepower - a.horsepower);
                break;
            case 'speedAsc':
                filteredMotors.sort((a, b) => a.maxSpeed - b.maxSpeed);
                break;
            case 'speedDesc':
                filteredMotors.sort((a, b) => b.maxSpeed - a.maxSpeed);
                break;
            case 'torqueAsc':
                filteredMotors.sort((a, b) => a.torque - b.torque);
                break;
            case 'torqueDesc':
                filteredMotors.sort((a, b) => b.torque - a.torque);
                break;
        }

        const motorsContainer = document.getElementById("motorsContainer");
        if (!motorsContainer) {
            throw new Error('Motors container element not found');
        }

        // Display filtered and sorted motors
        motorsContainer.innerHTML = filteredMotors.length ? '' : '<p class="no-results">Не са намерени мотори с избраните критерии.</p>';

        filteredMotors.forEach(motor => {
            motorsContainer.innerHTML += `
                <div class="row moto10">
                    <div class="col-12 col-md-5">
                        <img src="${motor.image}" alt="${motor.name}" class="content-image-left img-fluid">
                    </div>
                    <div class="col-12 col-md-7 deviding">
                        <h2 class="heading">${motor.name}</h2>
                        <ul class="specs-list">
                            <li class="specs-item">
                                <span class="specs-label">Производител:</span>
                                <span class="specs-value">${motor.manufacturer}</span>
                            </li>
                            <li class="specs-item">
                                <span class="specs-label">Максимална скорост:</span>
                                <span class="specs-value">${motor.maxSpeed} км/ч</span>
                            </li>
                            <li class="specs-item">
                                <span class="specs-label">Конски сили:</span>
                                <span class="specs-value">${motor.horsepower}</span>
                            </li>
                            <li class="specs-item">
                                <span class="specs-label">Въртящ момент:</span>
                                <span class="specs-value">${motor.torque} Nm</span>
                            </li>
                            <li class="specs-item">
                                <span class="specs-label">Цена:</span>
                                <span class="specs-value price-value">${motor.price} BGN</span>
                            </li>
                        </ul>
                        <div class="d-flex justify-content-center">
                            <button onclick="handlePurchase('${motor.name}', ${motor.numericPrice}); sendMail();" class="btn btnor">Поръчай</button>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error filtering motors:', error);
        const motorsContainer = document.getElementById("motorsContainer");
        if (motorsContainer) {
            motorsContainer.innerHTML = '<p class="error">Грешка при филтриране на моторите.</p>';
        }
    }
}

window.handlePurchase = async function(name, price) {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('Моля, влезте в профила си, за да направите поръчка.');
      return;
    }

    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      throw new Error('Невалидна цена');
    }

    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.exists() ? userDoc.data() : { email: user.email };

    const motorData = allMotors.find(motor => motor.name === name);
    if (!motorData) {
      throw new Error('Информацията за мотора не е намерена');
    }

    const requestData = {
      name: motorData.name,
      price: numericPrice,
      userData: {
        uid: user.uid,
        email: user.email,
        displayName: userData.displayName || user.email
      },
      motorData: {
        name: motorData.name,
        manufacturer: motorData.manufacturer,
        price: numericPrice,
        image: motorData.image
      }
    };

    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    let responseData;
    try {
      responseData = await response.json();
    } catch (parseError) {
      console.error('Response parsing error:', parseError);
      throw new Error('Невалиден отговор от сървъра');
    }

    if (!response.ok) {
      console.error('Server error response:', responseData);
      throw new Error(responseData.message || 'Грешка при обработка на поръчката');
    }

    if (!responseData.url) {
      throw new Error('Липсва URL за плащане');
    }

    window.location.href = responseData.url;

  } catch (error) {
    console.error('Purchase error:', error);
    alert(`Грешка при обработка на поръчката: ${error.message}`);
  }
};

// Add menu interaction handlers
document.addEventListener('DOMContentLoaded', () => {
    const navbarToggler = document.querySelector('.navbar-toggler');
    const navbarCollapse = document.querySelector('.navbar-collapse');
    const navbarLinks = document.querySelectorAll('.navbar-nav .nav-link');
    const dropdownLinks = document.querySelectorAll('.dropdown-menu .dropdown-item');

    // Add animation delay for menu items
    navbarLinks.forEach((link, index) => {
        link.style.transitionDelay = `${index * 0.1}s`;
    });

    // Handle link clicks
    navbarLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 992 && !link.classList.contains('dropdown-toggle')) {
                navbarToggler.click();
            }
        });
    });

    dropdownLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 992) {
                navbarToggler.click();
            }
        });
    });

    // Toggle menu-open class
    navbarToggler.addEventListener('click', function() {
        document.body.classList.toggle('menu-open');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (window.innerWidth < 992 && 
            !navbarCollapse.contains(e.target) && 
            !navbarToggler.contains(e.target)) {
            if (navbarCollapse.classList.contains('show')) {
                navbarToggler.click();
            }
        }
    });

    // Prevent event propagation
    navbarCollapse.addEventListener('click', (event) => {
        event.stopPropagation();
    });

    document.getElementById('applyFilters').addEventListener('click', filterAndDisplayMotors);
    document.getElementById('resetFilters').addEventListener('click', () => {
        document.getElementById('manufacturerFilter').value = '';
        document.getElementById('minPrice').value = '';
        document.getElementById('maxPrice').value = '';
        document.getElementById('powerFilter').value = '';
        document.getElementById('sortOption').value = 'default';
        filterAndDisplayMotors();
    });
    document.getElementById('sortOption').addEventListener('change', filterAndDisplayMotors);
});

// Cleanup function for event listeners
function cleanup() {
    const elements = {
        applyFilters: document.getElementById('applyFilters'),
        resetFilters: document.getElementById('resetFilters'),
        sortOption: document.getElementById('sortOption'),
        logoutLink: document.getElementById('logoutLink')
    };

    // Remove event listeners if elements exist
    if (elements.applyFilters) {
        elements.applyFilters.removeEventListener('click', filterAndDisplayMotors);
    }
    if (elements.resetFilters) {
        elements.resetFilters.removeEventListener('click', resetFilters);
    }
    if (elements.sortOption) {
        elements.sortOption.removeEventListener('change', filterAndDisplayMotors);
    }
    if (elements.logoutLink) {
        elements.logoutLink.removeEventListener('click', handleLogout);
    }
}

// Add cleanup to window unload
window.addEventListener('unload', cleanup);

// Initialize the display only after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    displayMotorsOnLogin();
    // ...existing event listener code...
});

displayMotorsOnLogin();

/// Правим функцията глобална
window.sendMail = function () {
    if (typeof emailjs === 'undefined') {
        console.error('EmailJS is not loaded');
        alert('Error: Email service is not available');
        return;
    }
    
    const user = auth.currentUser;
    if (!user) {
        alert("Трябва да сте влезли в профила си, за да получите email.");
        return;
    }

    let params = {
        email: user.email
    };

    emailjs.send("service_td105sn", "template_t6dcgla", params)
        .then(function(response) {
            console.log("Email sent successfully!", response);
            alert("Email изпратен успешно!");
        })
        .catch(function(error) {
            console.error("Error sending email:", error);
            alert("Грешка при изпращане на email.");
        });
};
