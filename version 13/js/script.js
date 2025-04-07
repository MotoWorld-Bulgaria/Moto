import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

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

document.addEventListener("DOMContentLoaded", () => {
  // Modal handling with z-index management
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    const navbar = document.querySelector('.navbar');
    const motors = document.querySelectorAll('.moto10');
    
    // Set modal display
    modal.style.display = "flex";
    document.body.classList.add("modal-open");
    
    // Adjust z-indices when modal opens
    if (navbar) {
      navbar.style.zIndex = "1000"; // Keep navbar above motors but below modal
    }
    
    // Lower z-index of all motors
    motors.forEach(motor => {
      motor.style.zIndex = "1";
    });
    
    // Set modal z-index higher than everything
    modal.style.zIndex = "2000";
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    const navbar = document.querySelector('.navbar');
    const motors = document.querySelectorAll('.moto10');
    
    // Hide modal
    modal.style.display = "none";
    document.body.classList.remove("modal-open");
    
    // Reset z-indices
    if (navbar) {
      navbar.style.zIndex = "1000";
    }
    
    // Reset motors z-index
    motors.forEach(motor => {
      motor.style.zIndex = "1";
    });
  }

  function switchModal(currentModalId, targetModalId) {
    closeModal(currentModalId);
    openModal(targetModalId);
  }

  function outsideClickHandler(event) {
    // Get all open modals
    const openModals = document.querySelectorAll(".modal[style*='display: flex']");
  
    openModals.forEach(modal => {
      // Check if the click is outside the modal and not on the modal content
      if (!modal.contains(event.target) && !event.target.closest('.modal-content') && !event.target.closest('.navbar')) {
        closeModal(modal.id);
      }
    });
  }
  
  // Make modal functions globally accessible
  window.openModal = openModal;
  window.closeModal = closeModal;
  window.switchModal = switchModal;

  document.querySelectorAll(".close").forEach((closeButton) => {
    closeButton.addEventListener("click", function () {
      closeModal(this.closest(".modal").id);
    });
  });

  document.querySelectorAll(".switch-modal-link").forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const currentModal = this.closest(".modal").id;
      const targetModal = this.getAttribute("data-target-modal");
      switchModal(currentModal, targetModal);
    });
  });

  // Handle registration
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form inputs
    const email = e.target.email.value;
    const password = e.target.password.value;
    const confirmPassword = e.target.confirmPassword.value;
    
    // Remove any existing error messages
    const existingErrors = document.querySelectorAll('.validation-error');
    existingErrors.forEach(error => error.remove());

    // Validate password match
    if (password !== confirmPassword) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'validation-error';
      errorDiv.textContent = 'Паролите не съвпадат!';
      e.target.confirmPassword.parentNode.insertBefore(errorDiv, e.target.confirmPassword.nextSibling);
      return; // Stop here if passwords don't match
    }

    // Validate password length
    if (password.length < 6) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'validation-error';
      errorDiv.textContent = 'Паролата трябва да бъде поне 6 символа!';
      e.target.password.parentNode.insertBefore(errorDiv, e.target.password.nextSibling);
      return; // Stop here if password is too short
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        closeModal('registerModal');
        window.location.href = 'login.html';
      }
    } catch (error) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'validation-error';
      if (error.code === 'auth/email-already-in-use') {
        errorDiv.textContent = 'Този имейл вече е регистриран!';
      } else {
        errorDiv.textContent = 'Възникна грешка при регистрацията.';
      }
      e.target.email.parentNode.insertBefore(errorDiv, e.target.email.nextSibling);
    }
  });

  // Handle login
  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = e.target.email;
    const password = e.target.password;
    
    // Remove any existing error messages
    const existingErrors = document.querySelectorAll('.validation-error');
    existingErrors.forEach(error => error.remove());

    signInWithEmailAndPassword(auth, email.value, password.value)
      .then((userCredential) => {
        const user = userCredential.user;
        closeModal('loginModal');
        window.location.href = 'login.html';
      })
      .catch((error) => {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'validation-error';
        errorDiv.textContent = 'Невалиден имейл или парола!';
        email.parentNode.insertBefore(errorDiv, email.nextSibling);
      });
  });

  // Fetch and Display Motors on Index Page
  async function displayMotorsOnIndex() {
    const motorsRef = collection(db, "motors");
    const snapshot = await getDocs(motorsRef);
    const allMotors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const motorsContainer = document.getElementById("motorsContainer");
    
    // Populate manufacturer filter
    const manufacturers = [...new Set(allMotors.map(motor => motor.manufacturer))];
    const manufacturerFilter = document.getElementById('manufacturerFilter');
    manufacturers.forEach(manufacturer => {
        const option = document.createElement('option');
        option.value = manufacturer;
        option.textContent = manufacturer;
        manufacturerFilter.appendChild(option);
    });

    function filterAndDisplayMotors() {
        const manufacturer = document.getElementById('manufacturerFilter').value;
        const minPrice = document.getElementById('minPrice').value;
        const maxPrice = document.getElementById('maxPrice').value;
        const power = document.getElementById('powerFilter').value;
        const speed = document.getElementById('speedFilter').value;
        const sortOption = document.getElementById('sortOption').value;

        let filteredMotors = [...allMotors];

        // Apply filters
        if (manufacturer) {
            filteredMotors = filteredMotors.filter(motor => motor.manufacturer === manufacturer);
        }
        if (minPrice) {
            filteredMotors = filteredMotors.filter(motor => {
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

        // Parse price for sorting
        filteredMotors = filteredMotors.map(motor => ({
            ...motor,
            numericPrice: parseFloat(motor.price.replace(/[^\d.]/g, ''))
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
                            <a href="#" class="btn btnor" onclick="openModal('loginModal'); return false;">Поръчай</a>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    // Add event listeners for filters and sorting
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

    // Initial display
    filterAndDisplayMotors();
  }
  displayMotorsOnIndex();

  async function handlePurchase(name, price) {
    try {
      const response = await fetch("http://localhost:3000/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, price }),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      window.location.href = data.url;
    } catch (error) {
      console.error("Error:", error);
    }
  }

  // Close burger menu on link click or outside click
  const navbarToggler = document.querySelector('.navbar-toggler');
  const navbarCollapse = document.querySelector('.navbar-collapse');
  const navbarLinks = document.querySelectorAll('.navbar-nav .nav-link');
  const dropdownLinks = document.querySelectorAll('.dropdown-menu .dropdown-item');

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

  document.addEventListener('click', (event) => {
    if (window.innerWidth < 992 && !navbarCollapse.contains(event.target) && !navbarToggler.contains(event.target)) {
      if (navbarCollapse.classList.contains('show')) {
        navbarToggler.click();
      }
    }
  });

  navbarCollapse.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  // Add inside your DOMContentLoaded event listener
  document.querySelector('.navbar-toggler').addEventListener('click', function() {
    document.body.classList.toggle('menu-open');
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    const menu = document.querySelector('.navbar-collapse');
    const toggler = document.querySelector('.navbar-toggler');
    
    if (menu.classList.contains('show') && 
        !menu.contains(e.target) && 
        !toggler.contains(e.target)) {
        toggler.click();
    }
  });
});