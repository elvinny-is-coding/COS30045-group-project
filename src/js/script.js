

// // Load Navigation dynamically
// function loadNav() {
//     const navItems = [
//         { name: 'US Map', file: 'map-vis/map.js' },
//         { name: 'Visualization 2', file: 'visualization2.js' },
//         // Add more visualizations here
//     ];

//     const navContainerNavbar = document.getElementById('nav-items-navbar');
//     const navContainerSidebar = document.getElementById('nav-items-sidebar');

//     // Clear existing buttons
//     navContainerNavbar.innerHTML = '';
//     navContainerSidebar.innerHTML = '';

//     navItems.forEach(item => {
//         // Create button for the navbar
//         const navLinkNavbar = document.createElement('button');
//         navLinkNavbar.textContent = item.name;
//         navLinkNavbar.className = "text-white font-semibold px-3 py-1";
//         navLinkNavbar.setAttribute('aria-label', `Load ${item.name} visualization`);
//         navLinkNavbar.onclick = () => loadVisualization(item.file);
//         navContainerNavbar.appendChild(navLinkNavbar);

//         // Create button for the sidebar
//         const navLinkSidebar = document.createElement('button');
//         navLinkSidebar.textContent = item.name;
//         navLinkSidebar.className = "text-white font-semibold px-3 py-1";
//         navLinkSidebar.setAttribute('aria-label', `Load ${item.name} visualization`);
//         navLinkSidebar.onclick = () => loadVisualization(item.file);
//         navContainerSidebar.appendChild(navLinkSidebar);
//     });
// }

// // Load Visualization
// function loadVisualization(file) {
//     clearVisualization();
//     const script = document.createElement('script');
//     script.src = file;
//     script.defer = true;

//     script.onload = () => {
//         if (typeof window.drawVisualization === 'function') {
//             window.drawVisualization(); // Call the visualization function
//         }
//         if (typeof window.loadButtons === 'function') {
//             window.loadButtons(); // Call the function to load specific buttons
//         }

//         // Set visualization title based on the file loaded
//         const titleMap = {
//             'map-vis/map.js': 'US Map',
//             'visualization2.js': 'Visualization 2',
//         };
//         document.getElementById('visualization-title').textContent = titleMap[file] || 'Visualization';
//     };

//     script.onerror = () => {
//         console.error(`Failed to load script: ${file}`);
//         alert('Error loading visualization. Please try again.');
//     };

//     document.body.appendChild(script);
// }

// Clear Visualization
// function clearVisualization() {
//     document.getElementById('visualization-title').textContent = '';
//     document.getElementById('visualization-buttons').innerHTML = '';
//     d3.select("#visualization").selectAll("*").remove();
// }
