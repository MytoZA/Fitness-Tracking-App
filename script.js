// --- 1. Get DOM Elements ---
// Main app content
const newWorkoutForm = document.getElementById('new-workout-form');
const workoutDateInput = document.getElementById('workout-date');
const exerciseTypeInput = document.getElementById('exercise-type');
const durationRepsInput = document.getElementById('duration-reps');
const workoutNotesInput = document.getElementById('workout-notes');
const workoutsContainer = document.getElementById('workouts-container');
const appContentDiv = document.getElementById('app-content'); // New: Main app content container

// Statistics elements
const totalWorkoutsSpan = document.getElementById('total-workouts');
const mostCommonExerciseSpan = document.getElementById('most-common-exercise');
const totalCaloriesBurnedSpan = document.getElementById('total-calories-burned');

// Editing, Filtering, Sorting elements
const formSubmitButton = newWorkoutForm.querySelector('button[type="submit"]');
const filterTypeSelect = document.getElementById('filter-type');
const sortOrderSelect = document.getElementById('sort-order');

// Chart elements
const caloriesChartCanvas = document.getElementById('caloriesBurnedChart').getContext('2d');
let caloriesChart;

// New: Authentication Elements
const authSection = document.getElementById('auth-section');
const loginFormContainer = document.getElementById('login-form-container');
const registerFormContainer = document.getElementById('register-form-container');

const loginForm = document.getElementById('login-form');
const loginUsernameInput = document.getElementById('login-username');
const loginPasswordInput = document.getElementById('login-password');
const loginMessage = document.getElementById('login-message');

const registerForm = document.getElementById('register-form');
const registerUsernameInput = document.getElementById('register-username');
const registerPasswordInput = document.getElementById('register-password');
const registerMessage = document.getElementById('register-message');

const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');

const authStatusDiv = document.getElementById('auth-status'); // New: Status message in header
const welcomeMessageSpan = document.getElementById('welcome-message'); // New: Welcome message
const logoutBtn = document.getElementById('logout-btn'); // New: Logout button


// --- Global State Variables ---
let editingWorkoutIndex = -1; // -1 means no workout is being edited
let workouts = []; // Current user's workout data
let currentUser = null; // Stores the username of the logged-in user


// --- Configuration for Calorie Calculation ---
const DEFAULT_USER_WEIGHT_KG = 70;

const MET_VALUES = {
    running: 8, weightlifting: 3, yoga: 2.5, cycling: 7.5, swimming: 6, other: 3
};

// --- Utility Functions ---
// Basic hashing for passwords (NOT SECURE for real apps, just for mock backend)
function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash.toString();
}

// --- Core Data Management Functions (User-Specific) ---

// Function to save current user's workouts to local storage
function saveWorkouts() {
    if (currentUser) {
        localStorage.setItem(`workouts_${currentUser}`, JSON.stringify(workouts));
    }
}

// Function to load current user's workouts from local storage
function loadWorkouts() {
    if (currentUser) {
        const storedWorkouts = localStorage.getItem(`workouts_${currentUser}`);
        if (storedWorkouts) {
            workouts = JSON.parse(storedWorkouts);
        } else {
            workouts = []; // No workouts for this user yet
        }
        renderWorkouts();
        updateStatistics();
        updateCharts();
    } else {
        workouts = []; // No user logged in, clear workouts
    }
}

// Function to get all registered users
function getUsers() {
    const users = localStorage.getItem('users');
    return users ? JSON.parse(users) : {};
}

// Function to save all registered users
function saveUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
}

// --- Authentication Functions ---

function registerUser(username, password) {
    const users = getUsers();
    if (users[username]) {
        registerMessage.textContent = 'Username already exists!';
        registerMessage.className = 'auth-message error';
        return false;
    }
    users[username] = hashPassword(password); // Store hashed password
    saveUsers(users);
    registerMessage.textContent = 'Registration successful! Please login.';
    registerMessage.className = 'auth-message success';
    registerForm.reset();
    showLoginForm(); // Immediately show login form after successful registration
    return true;
}

function loginUser(username, password) {
    const users = getUsers();
    const hashedPassword = hashPassword(password);

    if (users[username] && users[username] === hashedPassword) {
        currentUser = username;
        localStorage.setItem('currentUser', username); // Store current user in session
        loginMessage.textContent = 'Login successful!';
        loginMessage.className = 'auth-message success';
        loginForm.reset();
        displayAppContent(); // Show main app content
        loadWorkouts(); // Load workouts for the logged-in user
        return true;
    } else {
        loginMessage.textContent = 'Invalid username or password.';
        loginMessage.className = 'auth-message error';
        return false;
    }
}

function logoutUser() {
    currentUser = null;
    localStorage.removeItem('currentUser'); // Clear current user from session
    workouts = []; // Clear workouts from memory
    displayAuthSection(); // Show authentication section
    renderWorkouts(); // Clear displayed workouts
    updateStatistics(); // Reset stats
    updateCharts(); // Clear chart
    exitEditMode(); // Ensure edit mode is off
    welcomeMessageSpan.textContent = '';
    logoutBtn.style.display = 'none';
}

// --- UI Display Management ---

function displayAppContent() {
    authSection.style.display = 'none';
    appContentDiv.style.display = 'block';
    welcomeMessageSpan.textContent = `Welcome, ${currentUser}!`;
    logoutBtn.style.display = 'inline-block';
}

function displayAuthSection() {
    authSection.style.display = 'block';
    appContentDiv.style.display = 'none';
    showLoginForm(); // Default to login form when showing auth section
}

function showRegisterForm() {
    loginFormContainer.style.display = 'none';
    registerFormContainer.style.display = 'block';
    loginMessage.textContent = ''; // Clear messages
    registerMessage.textContent = '';
}

function showLoginForm() {
    loginFormContainer.style.display = 'block';
    registerFormContainer.style.display = 'none';
    loginMessage.textContent = ''; // Clear messages
    registerMessage.textContent = '';
}

// --- Existing App Functions (modified to integrate with authentication) ---

function calculateCalories(exerciseType, durationMinutes, userWeightKg) {
    const met = MET_VALUES[exerciseType] || MET_VALUES['other'];
    const durationHours = durationMinutes / 60;
    return Math.round(met * userWeightKg * durationHours);
}

function renderWorkouts() {
    workoutsContainer.innerHTML = '';

    let workoutsToDisplay = [...workouts];

    const selectedFilterType = filterTypeSelect.value;
    if (selectedFilterType !== 'all') {
        workoutsToDisplay = workoutsToDisplay.filter(workout =>
            workout.exerciseType === selectedFilterType
        );
    }

    const selectedSortOrder = sortOrderSelect.value;
    workoutsToDisplay.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (selectedSortOrder === 'newest') {
            return dateB - dateA;
        } else {
            return dateA - dateB;
        }
    });

    if (workoutsToDisplay.length === 0) {
        workoutsContainer.innerHTML = '<p>No workouts logged yet. Log one above!</p>';
    } else {
        workoutsToDisplay.forEach((workout) => {
            const listItem = document.createElement('li');
            // Find original index for edit/delete functions
            const originalIndex = workouts.findIndex(w => w === workout);
            listItem.setAttribute('data-index', originalIndex);
            listItem.innerHTML = `
                <strong>${workout.exerciseType.charAt(0).toUpperCase() + workout.exerciseType.slice(1)}</strong>
                <span>${workout.date}</span><br>
                Duration/Reps: ${workout.durationReps}<br>
                ${workout.caloriesBurned ? `Calories Burned: ${workout.caloriesBurned} kcal<br>` : ''}
                ${workout.notes ? `Notes: ${workout.notes}` : ''}
                <div class="workout-actions">
                    <button class="edit-btn">Edit</button>
                    <button class="delete-btn">Delete</button>
                </div>
            `;
            workoutsContainer.appendChild(listItem);
        });
    }


    addDeleteButtonListeners();
    addEditButtonListeners();
}

function updateStatistics() {
    totalWorkoutsSpan.textContent = workouts.length;

    let totalCalories = 0;
    const exerciseCounts = {};

    workouts.forEach(workout => {
        totalCalories += workout.caloriesBurned || 0;
        const type = workout.exerciseType;
        exerciseCounts[type] = (exerciseCounts[type] || 0) + 1;
    });

    totalCaloriesBurnedSpan.textContent = totalCalories;

    if (workouts.length === 0) {
        mostCommonExerciseSpan.textContent = 'N/A';
        return;
    }

    let mostCommon = '';
    let maxCount = 0;

    for (const type in exerciseCounts) {
        if (exerciseCounts[type] > maxCount) {
            maxCount = exerciseCounts[type];
            mostCommon = type;
        }
    }
    mostCommonExerciseSpan.textContent = mostCommon.charAt(0).toUpperCase() + mostCommon.slice(1);
}

function updateCharts() {
    const sortedWorkouts = [...workouts].sort((a, b) => new Date(a.date) - new Date(b.date));

    const chartLabels = sortedWorkouts.map(workout => workout.date);
    const chartData = sortedWorkouts.map(workout => workout.caloriesBurned || 0);

    if (caloriesChart) {
        caloriesChart.destroy();
    }

    caloriesChart = new Chart(caloriesChartCanvas, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Calories Burned (kcal)',
                data: chartData,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Calories Burned' }
                },
                x: {
                    title: { display: true, text: 'Date' }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title: function(context) { return context[0].label; },
                        label: function(context) {
                            const originalWorkout = sortedWorkouts[context.dataIndex];
                            let label = `Exercise: ${originalWorkout.exerciseType.charAt(0).toUpperCase() + originalWorkout.exerciseType.slice(1)}`;
                            label += ` | Duration: ${originalWorkout.durationReps}`;
                            label += ` | Calories: ${originalWorkout.caloriesBurned} kcal`;
                            return label;
                        }
                    }
                }
            }
        }
    });
}

function deleteWorkout(indexToDelete) {
    if (!currentUser) return; // Prevent deletion if not logged in
    workouts.splice(indexToDelete, 1);
    saveWorkouts();
    renderWorkouts();
    updateStatistics();
    updateCharts();
    exitEditMode();
}

function editWorkout(indexToEdit) {
    if (!currentUser) return; // Prevent editing if not logged in
    const workoutToEdit = workouts[indexToToEdit];

    workoutDateInput.value = workoutToEdit.date;
    exerciseTypeInput.value = workoutToEdit.exerciseType;
    durationRepsInput.value = workoutToEdit.durationReps;
    workoutNotesInput.value = workoutToEdit.notes;

    formSubmitButton.textContent = 'Update Workout';
    editingWorkoutIndex = indexToEdit;

    workoutDateInput.focus();
}

function exitEditMode() {
    newWorkoutForm.reset();
    formSubmitButton.textContent = 'Log Workout';
    editingWorkoutIndex = -1;
}

function addDeleteButtonListeners() {
    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const listItem = this.closest('li');
            const index = parseInt(listItem.getAttribute('data-index'));
            deleteWorkout(index);
        });
    });
}

function addEditButtonListeners() {
    const editButtons = document.querySelectorAll('.edit-btn');
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const listItem = this.closest('li');
            const index = parseInt(listItem.getAttribute('data-index'));
            editWorkout(index);
        });
    });
}

// --- Event Listeners ---

// Authentication form submissions
registerForm.addEventListener('submit', function(event) {
    event.preventDefault();
    const username = registerUsernameInput.value.trim();
    const password = registerPasswordInput.value.trim();
    if (username && password) {
        registerUser(username, password);
    } else {
        registerMessage.textContent = 'Username and password cannot be empty.';
        registerMessage.className = 'auth-message error';
    }
});

loginForm.addEventListener('submit', function(event) {
    event.preventDefault();
    const username = loginUsernameInput.value.trim();
    const password = loginPasswordInput.value.trim();
    if (username && password) {
        loginUser(username, password);
    } else {
        loginMessage.textContent = 'Username and password cannot be empty.';
        loginMessage.className = 'auth-message error';
    }
});

// Toggle between login and register forms
showRegisterLink.addEventListener('click', function(event) {
    event.preventDefault();
    showRegisterForm();
});

showLoginLink.addEventListener('click', function(event) {
    event.preventDefault();
    showLoginForm();
});

// Logout button
logoutBtn.addEventListener('click', logoutUser);


// Main workout form submission
newWorkoutForm.addEventListener('submit', function(event) {
    event.preventDefault();
    if (!currentUser) {
        alert('Please log in to log workouts.');
        return;
    }

    const durationRepsValue = durationRepsInput.value;
    let durationMinutes = 0;

    const match = durationRepsValue.match(/(\d+)\s*mins?/i);
    if (match && match[1]) {
        durationMinutes = parseInt(match[1]);
    } else {
        console.warn("Could not parse duration from:", durationRepsValue);
        // Provide user feedback if duration cannot be parsed for calories
        // You might want to remove 'required' from duration-reps if parsing is optional
    }

    const caloriesBurned = calculateCalories(
        exerciseTypeInput.value,
        durationMinutes,
        DEFAULT_USER_WEIGHT_KG
    );

    const workout = {
        date: workoutDateInput.value,
        exerciseType: exerciseTypeInput.value,
        durationReps: durationRepsValue,
        notes: workoutNotesInput.value,
        caloriesBurned: caloriesBurned
    };

    if (editingWorkoutIndex !== -1) {
        workouts[editingWorkoutIndex] = workout;
    } else {
        workouts.push(workout);
    }

    saveWorkouts();
    renderWorkouts();
    updateStatistics();
    updateCharts();
    exitEditMode();
});

// Event listeners for filter and sort controls
filterTypeSelect.addEventListener('change', renderWorkouts);
sortOrderSelect.addEventListener('change', renderWorkouts);


// --- Initial Load Logic ---
document.addEventListener('DOMContentLoaded', () => {
    // Check if a user was previously logged in (e.g., from a session storage/localStorage)
    const storedCurrentUser = localStorage.getItem('currentUser');
    if (storedCurrentUser) {
        currentUser = storedCurrentUser;
        displayAppContent();
        loadWorkouts();
    } else {
        displayAuthSection(); // Show login/register if no user is logged in
    }
});