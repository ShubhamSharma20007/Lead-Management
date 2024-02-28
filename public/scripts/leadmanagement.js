
  
  

    // remove the underscore from the

        const info = document.querySelectorAll('.info');
        info.forEach(element => {
            element.innerHTML = element.innerHTML.replace("_", " ");
        })

        function allowDrop(ev) {

            ev.preventDefault();
        }

        function drag(ev) {
            ev.dataTransfer.setData("text", ev.target.id);
            ev.dataTransfer.setData("containerId", ev.target.parentElement.id);
        }

        function drop(ev) {
     
            ev.preventDefault();
     
            var data = ev.dataTransfer.getData("text");
            var draggedElement = document.getElementById(data);
            var target = ev.target.closest('.board-item');
            var container = ev.target.closest('.board-column-content');

            if (target) {
                // Determine if the dragged card is above or below the target card
                var rect = target.getBoundingClientRect();
                var mouseY = ev.clientY;
                var isBelow = mouseY > rect.top + rect.height / 2;

                // Insert the dragged card before or after the target card
                if (isBelow) {
                    container.insertBefore(draggedElement, target.nextElementSibling);
                } else {
                    container.insertBefore(draggedElement, target);
                }
            } else {
                // If there is no target card, simply append the dragged card to the container
                container.appendChild(draggedElement);
            }

            // Get the unique identifier for the lead
            var leadId = draggedElement.getAttribute('data-lead-id');
            console.log('Lead ID:', leadId);

            // Determine the target_status based on the container ID
            var targetStatus;
            var containerId = findContainerId(ev.target);

            console.log('Container ID:', containerId);

            switch (containerId) {
                case "container1":
                    targetStatus = 'New Lead';
                    break;
                case "container2":
                    targetStatus = 'Contact Initiation';
                    break;
                case "container3":
                    targetStatus = 'Schedule Follow Up';
                    break;
                default:
                    console.error('Invalid container ID:', containerId);
                    return; // Exit the function if container ID is invalid
            }

            console.log('Target Status:', targetStatus);

            // Update the target_status in the database
            fetch(`/updateLeadStatus/${leadId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ target_status: targetStatus })
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to update lead status');
                    }
                    // Optional: Reload the page to reflect the changes
                    window.location.reload();
                })
                .catch(error => {
                    console.error('Error updating lead status:', error);
                });
        }


        function findContainerId(element) {
            // Traverse up the DOM tree until finding an element with an ID
            while (element && !element.id) {
                element = element.parentNode;
            }
            return element ? element.id : null;
        }


        
    // custom field functionlity

    function AddField() {
        const addFieldBtn = document.querySelector('.addFieldBtn')
        addFieldBtn.addEventListener('click', async () => {
            const value = prompt('Please Enter the field name', 'Ex. New Field')
            try {
                const res = await fetch('/customfield', {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    method: "POST",
                    body: JSON.stringify({ value })
                })
                if (res.ok) {
                    const data = await res.json();
                    const container = document.querySelector('.slide-container');
                    const newColumn = document.createElement('div');
                    newColumn.classList.add('board-column', 'todo');
                    newColumn.id = `container${data.data.Id}`;
                    newColumn.dataset.containerId = `container${data.data.Id}`;
                    newColumn.setAttribute('ondrop', 'drop(event)');
                    newColumn.setAttribute('ondragover', 'allowDrop(event)');
                    newColumn.innerHTML = `
                        <div class="board-column-container">
                            <div class="board-column-header" data-target-status="${value}">${value}(0)</div>
                            <div class="board-column-content-wrapper">
                                <div class="board-column-content"></div>
                            </div>
                        </div>
                    `;
                    container.appendChild(newColumn);
                } else {
                    throw new Error('Failed to add field');
                }
            } catch (error) {
                console.log(error)
            }
    
        })
    
    }
    

    AddField()
