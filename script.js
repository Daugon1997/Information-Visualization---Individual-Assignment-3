// Position graph
const margin = { top: 40, right: 150, bottom: 50, left: 80 };
const width  = 900 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// Severity colors, Slight = green & Serious = orange & Fatal = red, like the traffic light
const severityOrder = ["Slight", "Serious", "Fatal"];
const severityColors = ["#4daf4a", "#ffa726", "#e41a1c"];

const svg = d3.select("#chart")
    .append("svg")
    .attr("width",  width  + margin.left + margin.right)
    .attr("height", height + margin.top  + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
// Style rules
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
// Data
d3.csv("Data/road_accidents_data_preview.csv", row => {
    let hour = NaN;
    if (row.Time) {
        const parts = row.Time.trim().split(":");
        hour = +parts[0]; }
    let severity = row.Accident_Severity;
    if (severity === "Fetal") severity = "Fatal";  // fix typo

    return { hour, severity };
}).then(data => {
    const filtered = data.filter(d => !isNaN(d.hour) && d.severity);
    const grouped = d3.rollup(
        filtered,
        v => v.length,
        d => d.hour,
        d => d.severity);

    let hours = Array.from(grouped, ([hour, sevMap]) => {
        const obj = { hour: +hour };
        sevMap.forEach((count, sev) => obj[sev] = count);
        return obj;
    });

    hours.sort((a, b) => d3.ascending(a.hour, b.hour));
    const severities = severityOrder.filter(s =>
        filtered.some(d => d.severity === s)
    );
    hours.forEach(d => {
        severities.forEach(s => {
            if (!d[s]) d[s] = 0;
        });
    });
    const x = d3.scaleBand()
        .domain(hours.map(d => d.hour))
        .range([0, width])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([
            0,
            d3.max(hours, d => severities.reduce((sum, s) => sum + d[s], 0))
        ])
        .nice()
        .range([height, 0]);

    const color = d3.scaleOrdinal()
        .domain(severities)
        .range(severityColors.slice(0, severities.length));

    const stack = d3.stack().keys(severities);
    const stackedData = stack(hours);
    const layers = svg.selectAll(".layer")
        .data(stackedData)
        .enter()
        .append("g")
        .attr("class", "layer")
        .attr("fill", d => color(d.key));

    layers.selectAll("rect")
        .data(d => d)
        .enter()
        .append("rect")
        .attr("x", d => x(d.data.hour))
        .attr("width", x.bandwidth())
        .attr("y", height)
        .attr("height", 0)
        .transition()
        .duration(800)
        .attr("y", d => y(d[1]))
        .attr("height", d => y(d[0]) - y(d[1]));

    svg.selectAll("rect")
        .on("mouseover", (event, d) => {
            const hour = d.data.hour;
            const details = severities.map(s => `${s}: ${d.data[s]}`).join("<br>");
            const total = severities.reduce((sum, s) => sum + d.data[s], 0);

            tooltip
                .style("opacity", 1)
                .html(
                    `<strong>Hour:</strong> ${hour}:00<br>
                     <strong>Total accidents:</strong> ${total}<br><br>
                     ${details}`
                )
                .style("left",  (event.pageX + 10) + "px")
                .style("top",   (event.pageY - 20) + "px");
        })
        .on("mouseout", () => {
            tooltip.style("opacity", 0);
        });
    const xAxis = d3.axisBottom(x).tickFormat(d => d + ":00");
    const yAxis = d3.axisLeft(y);

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(xAxis);

    svg.append("g")
        .call(yAxis);

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .text("Time of the day per hour");

    svg.append("text")
        .attr("x", -height / 2)
        .attr("y", -60)
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Number of accidents");

    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width + 20}, 10)`);

    legend.selectAll("rect")
        .data(severities)
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i * 22)
        .attr("width", 18)
        .attr("height", 18)
        .attr("fill", d => color(d));

    legend.selectAll("text")
        .data(severities)
        .enter()
        .append("text")
        .attr("x", 25)
        .attr("y", (d, i) => i * 22 + 14)
        .text(d => d)
        .style("font-size", "14px")
        .style("alignment-baseline", "middle");
});

