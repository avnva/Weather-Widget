document.addEventListener('DOMContentLoaded', async () => {
    const locationElement = document.querySelector('.location');
    const temperatureElement = document.querySelector('.temperature');
    const descriptionElement = document.querySelector('.description');
    const hourlyForecastElement = document.querySelector('.hourly-forecast');
    const weeklyForecastElement = document.querySelector('.weekly-forecast');

    if (!locationElement || !temperatureElement || !descriptionElement || !hourlyForecastElement || !weeklyForecastElement) {
        console.error('One or more required elements not found.');
        return;
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async position => {
            const { latitude, longitude } = position.coords;
            const apiKey = '1bd666dc43affae3a838e672ac1aa953';

            try {
                const currentWeatherData = await GetWeatherData(latitude, longitude, apiKey);
                if (currentWeatherData) {
                    DisplayCurrentWeather(currentWeatherData);
                } else {
                    console.error('No current weather data available.');
                }

                const forecastWeatherData = await GetForecastWeather(latitude, longitude, apiKey);
                if (forecastWeatherData) {
                    DisplayHourlyWeather(forecastWeatherData);
                    DisplayWeeklyWeather(forecastWeatherData);
                } else {
                    console.error('No forecast weather data available.');
                }
            } catch (error) {
                console.error('Error fetching weather data:', error);
            }
        }, error => {
            console.error('Error getting location:', error);
        });
    } else {
        console.error('Geolocation is not supported by this browser.');
    }
});

async function GetWeatherData(latitude, longitude, apiKey) {
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric&lang=ru`;
    const response = await fetch(apiUrl);
    return response.ok ? await response.json() : null;
}

async function GetForecastWeather(latitude, longitude, apiKey) {
    const apiUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric&lang=ru`;
    const response = await fetch(apiUrl);
    return response.ok ? await response.json() : null;
}

function DisplayCurrentWeather(data) {
    const { name: location, main: { temp: temperature }, weather } = data;
    const description = weather.length > 0 ? weather[0].description : 'No description';

    const locationElement = document.querySelector('.location');
    const temperatureElement = document.querySelector('.temperature');
    const descriptionElement = document.querySelector('.description');
    const iconElement = document.querySelector('.icon');

    locationElement.textContent = location;
    temperatureElement.textContent = `${Math.round(temperature)}°C`;
    descriptionElement.textContent = description;

    if (iconElement && weather.length > 0) {
        iconElement.innerHTML = `<img src="http://openweathermap.org/img/wn/${weather[0].icon}.png" alt="Weather Icon">`;
    }
}

function DisplayHourlyWeather(data) {
    const hourlyForecastElement = document.querySelector('.hourly-forecast');
    if (!hourlyForecastElement) {
        console.error('Hourly forecast element not found.');
        return;
    }
    hourlyForecastElement.innerHTML = '<h3>Погода на ближайшее время:</h3>';

    const today = new Date().getDate(); // Получаем текущий день
    for (let i = 0; i < data.list.length; i++) {
        const forecast = data.list[i];
        const forecastDate = new Date(forecast.dt * 1000);

        // Проверяем, что прогноз находится в пределах текущего дня
        if (forecastDate.getDate() === today) {
            const time = forecastDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const temperature = `${Math.round(forecast.main.temp)}°C`; // Округляем температуру до целого числа
            const description = forecast.weather[0].description;

            const forecastItem = document.createElement('div');
            forecastItem.classList.add('hourly-forecast-item');
            forecastItem.innerHTML = `<strong>${time}</strong>: ${temperature}, ${description}`;

            hourlyForecastElement.appendChild(forecastItem);
        }
    }
}

function DisplayWeeklyWeather(data) {
    const dailyForecastData = prepareDailyForecastData(data);
    const weeklyForecastElement = document.querySelector('.weekly-forecast');
    if (!weeklyForecastElement) {
        console.error('Weekly forecast element not found.');
        return;
    }
    weeklyForecastElement.innerHTML = '<h3>Погода на неделю:</h3>';
    const forecastContainer = document.createElement('div');
    forecastContainer.classList.add('forecast-container');
    weeklyForecastElement.appendChild(forecastContainer);
    dailyForecastData.forEach(dayData => {
        const { dayOfWeek, averageTemperature, mostFrequentIcon } = dayData;
        const forecastItem = document.createElement('div');
        forecastItem.classList.add('daily-forecast-item');
        forecastItem.innerHTML = `
            <div>${dayOfWeek}</div>
            <div>${Math.round(averageTemperature)}°C</div>
            <div><img src="http://openweathermap.org/img/wn/${mostFrequentIcon}.png" alt="Weather Icon"></div>
        `;
        forecastContainer.appendChild(forecastItem);
    });
}


function prepareDailyForecastData(data) {
    const dailyForecast = {};
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + 1); // Начинаем с следующего дня

    data.list.forEach(forecast => {
        const forecastDate = new Date(forecast.dt * 1000);
        
        // Проверяем, что прогноз погоды находится в будущем
        if (forecastDate.getDate() >= currentDate.getDate() && forecastDate.getHours() >= 6 && forecastDate.getHours() < 21) {
            const dayOfWeek = forecastDate.toLocaleDateString('ru-RU', { weekday: 'long' });
            if (!dailyForecast[dayOfWeek]) {
                dailyForecast[dayOfWeek] = {
                    temperatures: [],
                    icons: [],
                    descriptions: []
                };
            }
            dailyForecast[dayOfWeek].temperatures.push(forecast.main.temp);
            dailyForecast[dayOfWeek].icons.push(forecast.weather[0].icon);
            dailyForecast[dayOfWeek].descriptions.push(forecast.weather[0].description);
        }
    });
    
    return Object.keys(dailyForecast).map(dayOfWeek => {
        const temperatures = dailyForecast[dayOfWeek].temperatures;
        const icons = dailyForecast[dayOfWeek].icons;
        const mostFrequentIcon = findMostFrequentElement(icons);
        const averageTemperature = temperatures.reduce((acc, curr) => acc + curr, 0) / temperatures.length;
        return { dayOfWeek, averageTemperature, mostFrequentIcon };
    });
}







function findMostFrequentElement(arr) {
    const counts = {};
    let maxCount = 0;
    let mostFrequentElement = null;
    arr.forEach(element => {
        counts[element] = (counts[element] || 0) + 1;
        if (counts[element] > maxCount) {
            maxCount = counts[element];
            mostFrequentElement = element;
        }
    });
    return mostFrequentElement;
}
