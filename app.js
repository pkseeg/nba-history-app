// Define a color dictionary with team names as keys and corresponding colors as values
var teamColors = {
    "Atlanta Hawks": "#E03A3E",
    "Boston Celtics": "#008348",
    "Brooklyn Nets": "#000000",
    "Buffalo Braves": "#E75300",
    "Charlotte Bobcats": "#E75512",
    "Charlotte Hornets": "#1D1160",
    "Chicago Bulls": "#CE1141",
    "Cleveland Cavaliers": "#860038",
    "Dallas Mavericks": "#007DC5",
    "Denver Nuggets": "#4D90CD",
    "Detroit Pistons": "#C8102E",
    "Golden State Warriors": "#FFC72C",
    "Houston Rockets": "#CE1141",
    "Indiana Pacers": "#00275D",
    "Kansas City Kings": "#013094",
    "LA Clippers": "#1D42BA",
    "Los Angeles Lakers": "#552583",
    "Memphis Grizzlies": "#5D76A9",
    "Miami Heat": "#98002E",
    "Milwaukee Bucks": "#00471B",
    "Minnesota Timberwolves": "#236192",
    "New Orleans Hornets": "#008EAB",
    "New Orleans Pelicans": "#0C2340",
    "New York Knicks": "#F58426",
    "New York Nets": "#000000",
    "Oklahoma City Hornets": "#1D1160",
    "Oklahoma City Thunder": "#007DC3",
    "Orlando Magic": "#007DC5",
    "Philadelphia 76ers": "#006BB6",
    "Phoenix Suns": "#1D1160",
    "Portland Trail Blazers": "#E03A3E",
    "Sacramento Kings": "#5A2D81",
    "San Antonio Spurs": "#C4CED4",
    "Toronto Raptors": "#CE1141",
    "Utah Jazz": "#002B5C",
    "Vancouver Grizzlies": "#018FA1",
    "Washington Bullets": "#DA101E",
    "Washington Wizards": "#002B5C",
    // Add more teams and colors as needed
};
// Function to load data based on selected CSV files
function loadData() {
    var selectedCsv1 = document.getElementById("csvSelect").value;
    var selectedCsv2 = document.getElementById("csvSelect2").value;

    // Load data for the first team
    d3.csv(selectedCsv1).then(function(data1) {
        // Load data for the second team
        d3.csv(selectedCsv2).then(function(data2) {
            // Combine data from both teams
            var combinedData = combineData(data1, data2);

            // Clear existing container
            d3.select("#chart-container").selectAll("*").remove();

            // Create a container div to hold both the chart and the legend
            var container = d3.select("#chart-container");

            // Clear existing chart
            d3.select("#chart").selectAll("*").remove();
            d3.select("#legend").selectAll("*").remove();

            // Extract team names from the selected CSV file paths
            var team1 = extractTeamName(selectedCsv1);
            var team2 = extractTeamName(selectedCsv2);

            // Update the chart & legend with combined data
            updateChart(container, combinedData, teamColors[team1], teamColors[team2]);
            updateLegend(container, team1, team2, teamColors[team1], teamColors[team2]);
        });
    });
}

// Initial load with default CSV files
d3.csv("data/Utah Jazz_win_loss.csv").then(function(data1) {
    // Load data for the second team (you can replace this with a default second team)
    d3.csv("data/Golden State Warriors_win_loss.csv").then(function(data2) {
        // Combine data from both teams
        var combinedData = combineData(data1, data2);

        // Create a container div to hold both the chart and the legend
        var container = d3.select("#chart-container");

        // Update the chart & legend with combined data
        updateChart(container, combinedData, teamColors["Utah Jazz"], teamColors["Golden State Warriors"]);
        updateLegend(container, "Utah Jazz", "Golden State Warriors", teamColors["Utah Jazz"], teamColors["Golden State Warriors"]);
    });
});

// Combine data from two teams
function combineData(data1, data2) {
    // Assuming both datasets have the same structure (years, win_loss)
    // Combine data by adding win_loss values from the second dataset to the first dataset
    var combinedData = data1.map(function(d, i) {
        return {
            year: d.year,
            win_loss1: d.win_loss,
            win_loss2: data2[i].win_loss
        };
    });

    return combinedData;
}


// Load data from CSV file
function updateChart(container, data, color1, color2) {
    // Convert strings to numbers if necessary
    data.forEach(function(d) {
        d.win_loss = +d.win_loss;
    });

    // Set up SVG and chart dimensions
    var margin = { top: 20, right: 20, bottom: 30, left: 40 },
        width = 600 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    // Create SVG element within the container
    var svg = container.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


    // Create SVG element
    var svg = d3.select("#chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Create x and y scales
    var x = d3.scaleBand().range([0, width]).padding(0.1);
    var y = d3.scaleLinear().range([height, 0]);

    

    // Set domain of scales based on data
    x.domain(data.map(function(d) { return d.year; }));
    y.domain([-700, 950]);

    // Create bars for the first team
    svg.selectAll(".bar1")
    .data(data)
    .enter().append("rect")
    .attr("class", "bar1")
    .attr("x", function(d) { return x(d.year); })
    .attr("width", x.bandwidth())  // Adjust the width as needed
    .attr("y", function(d) {
        return d.win_loss1 < 0 ? y(0) : y(d.win_loss1);
    })
    .attr("height", function(d) {
        return Math.abs(y(0) - y(d.win_loss1));
    })
    .attr("fill", color1)   // Set the fill color for the first team
    .attr("opacity", 0.8);       // Set the opacity (adjust as needed)

    // Create bars for the second team
    svg.selectAll(".bar2")
    .data(data)
    .enter().append("rect")
    .attr("class", "bar2")
    .attr("x", function(d) { return x(d.year); })
    .attr("width", x.bandwidth())  // Adjust the width as needed
    .attr("y", function(d) {
        return d.win_loss2 < 0 ? y(0) : y(d.win_loss2);
    })
    .attr("height", function(d) {
        return Math.abs(y(0) - y(d.win_loss2));
    })
    .attr("fill", color2)      // Set the fill color for the second team
    .attr("opacity", 0.4);       // Set the opacity (adjust as needed)


   // Create x-axis
    svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("text-anchor", "end") // Optional: set text anchor to end
    .attr("dx", "-.8em") // Optional: adjust horizontal position
    .attr("dy", ".15em") // Optional: adjust vertical position
    .attr("transform", "rotate(-90)"); // Rotate the tick labels by 90 degrees


    // Create y-axis
    svg.append("g")
        .call(d3.axisLeft(y));
}

// Update legend based on selected teams
function updateLegend(container, team1, team2, color1, color2) {
    var legend = d3.select("#legend");

    // Create a legend container div
    var legendContainer = container.append("div")
        .attr("id", "legend")
        .style("display", "flex")
        .style("justify-content", "center");

    // Create a legend for the first team with a colored square
    var legendItem1 = legend.append("div")
        .style("display", "flex")
        .style("align-items", "center");

    legendItem1.append("div")
        .style("width", "10px")
        .style("height", "10px")
        .style("background-color", color1)
        .style("opacity", 0.8)
        .style("margin-right", "5px");

    legendItem1.append("div")
        .text(team1);

    // Create a legend for the second team with a colored square
    var legendItem2 = legend.append("div")
        .style("display", "flex")
        .style("align-items", "center");

    legendItem2.append("div")
        .style("width", "10px")
        .style("height", "10px")
        .style("background-color", color2)
        .style("opacity", 0.4)
        .style("margin-right", "5px");

    legendItem2.append("div")
        .text(team2);
}

// Extract team name from the CSV file path
function extractTeamName(csvPath) {
    var startIndex = csvPath.lastIndexOf("/") + 1; // Adjust if using Windows file paths
    var endIndex = csvPath.indexOf("_win_loss.csv");
    var teamName = csvPath.substring(startIndex, endIndex);
    return teamName;
}
