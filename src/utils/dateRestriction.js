// Utility to restrict date inputs to today or earlier

/**
 * Sets the max date attribute to today for the specified date input element
 * and adds validation to prevent future dates
 * @param {HTMLInputElement} dateInput - The date input element to restrict
 */
export function restrictDateToToday(dateInput) {
  if (!dateInput || dateInput.type !== 'date') return;
  
  // Set max attribute to today's date
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const maxDate = `${year}-${month}-${day}`;
  
  dateInput.max = maxDate;
  
  // Add event listener to validate input
  dateInput.addEventListener('input', function() {
    const selectedDate = new Date(this.value);
    
    // If date is in future, reset to today
    if (selectedDate > today) {
      this.value = maxDate;
    }
  });
}

/**
 * Finds all date inputs on the page and restricts them to today or earlier
 */
export function restrictAllDateInputs() {
  const dateInputs = document.querySelectorAll('input[type="date"]');
  dateInputs.forEach(restrictDateToToday);
  console.log(`Restricted ${dateInputs.length} date inputs to today or earlier`);
}