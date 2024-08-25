'use strict';
import { nanoid } from 'https://cdn.jsdelivr.net/npm/nanoid/nanoid.js';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--temp');
const inputElevation = document.querySelector('.form__input--climb');

class App {
  #mapEvent;
  #map;
  #workouts = [];

  constructor() {
    this._getPosition();
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleClimbField.bind(this));
    containerWorkouts.addEventListener('click', this._moveToWorkout.bind(this));
    containerWorkouts.addEventListener(
      'dblclick',
      this._deleteWorkout.bind(this)
    );
    this._getLocalStorageData();
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this));
    } else {
      alert('Ваша геолокация не смогла быть загружена');
    }
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    this.#map = L.map('map').setView([latitude, longitude], 13);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(workout => this._showPoint(workout));
  }

  _showForm(e) {
    this.#mapEvent = e;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    form.classList.add('hidden');
  }

  _toggleClimbField() {
    inputCadence.parentElement.classList.toggle('form__row--hidden');
    inputElevation.parentElement.classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();
    const { lat, lng } = this.#mapEvent.latlng;
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    let workout;

    const areNumbers = (...numbers) =>
      numbers.every(num => Number.isFinite(num));
    const areNumbersPositive = (...numbers) => numbers.every(num => num > 0);

    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !areNumbers(distance, duration, cadence) ||
        !areNumbersPositive(distance, duration, cadence)
      )
        return alert('Введите положительное число!');
      workout = new Running(distance, duration, [lat, lng], cadence);
    }

    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !areNumbers(distance, duration, elevation) ||
        !areNumbersPositive(distance, duration)
      )
        return alert('Введите положительное число!');
      workout = new Cycling(distance, duration, [lat, lng], elevation);
    }
    this._showPoint(workout);
    this.#workouts.push(workout);
    this._addWorkoutsToLocalStorage.call(this);
    this._displayWorkoutToSidebar(workout);
    this._hideForm();
  }
  _showPoint(workout) {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          content: `${workout.type === 'running' ? '🏃' : '🚵‍♂️'} ${
            workout.date
          }`,
          maxWidth: 110,
          maxHeight: 30,
          autoClose: false,
          className: `${workout.type}-popup`,
          closeOnClick: false,
        })
      )
      .openPopup();
  }
  _displayWorkoutToSidebar(workout) {
    const html = `<li class="workout workout--running" data-id="${workout._id}">
          <h2 class="workout__title">${
            workout.type === 'running' ? 'Пробежка' : 'Велотренировка'
          } ${workout.date}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃' : '🚵‍♂️'
            }</span>
            <span class="workout__value">5.0</span>
            <span class="workout__unit">км</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">21</span>
            <span class="workout__unit">мин</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">📏</span>
            <span class="workout__value">238</span>
            <span class="workout__unit">${
              workout.type === 'running' ? 'м/мин' : 'км/ч'
            }</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '⏱' : '🏔'
            }</span>
            <span class="workout__value">340</span>
            <span class="workout__unit">${
              workout.type === 'running' ? 'шаг/мин' : 'м'
            }</span>
          </div>
        </li>`;
    form.insertAdjacentHTML('afterend', html);
  }
  _moveToWorkout(e) {
    const workoutELement = e.target.closest('.workout');
    if (!workoutELement) return;
    const workout = this.#workouts.find(
      item => item._id == workoutELement.dataset.id
    );
    workout.click();
    console.log(this.#workouts);
    this.#map.setView(workout.coords, 13, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _addWorkoutsToLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorageData() {
    const localDate = JSON.parse(localStorage.getItem('workouts'));
    if (!localDate) return;
    localDate.forEach(date => {
      if (date.type === 'running') {
        this.#workouts.push(
          new Running(date.distance, date.duration, date.coords, date.temp)
        );
      }
      if (date.type === 'cycling') {
        this.#workouts.push(
          new Cycling(date.distance, date.duration, date.coords, date.climb)
        );
      }
    });

    this.#workouts.forEach(work => this._displayWorkoutToSidebar(work));
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  _deleteWorkout(e) {
    const workoutELement = e.target.closest('.workout');
    if (!workoutELement) return;
    const workoutIndex = this.#workouts.findIndex(
      item => item._id == workoutELement.dataset.id
    );
    this.#workouts.splice(workoutIndex, 1);
    this._clearAll();
  }

  _clearAll() {
    form.innerHTML = ' ';
  }
}

class Workout {
  _id = nanoid();
  clickNumber = 0;

  constructor(distance, duration, coords) {
    this.distance = distance;
    this.duration = duration;
    this.coords = coords;
    this.date = new Intl.DateTimeFormat('ru-RU').format(new Date());
  }

  click() {
    this.clickNumber++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(distance, duration, coords, temp) {
    super(distance, duration, coords);
    this.temp = temp;
    this.calculatePace();
  }
  calculatePace() {
    this.pace = this.duration / this.distance;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(distance, duration, coords, climb) {
    super(distance, duration, coords);
    this.climb = climb;
    this.calculateSpeed();
  }
  calculateSpeed() {
    this.speed = this.distance / this.duration / 60;
  }
}

const app = new App();
