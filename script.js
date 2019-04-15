
var dt = new Date();
document.getElementById("datetime").innerHTML = dt.toLocaleString();

function daily_ranking(data){

	var today = new Date()
	time = String(today.getHours() + ":" + today.getMinutes())

	string_date = String(today.getMonth() + 1) + "/" + today.getDate() + "/" + today.getFullYear()

	todays_minis = data.filter(function (a) { 
		a.str_date = String(today.getMonth() + 1) + "/" + today.getDate() + "/" + today.getFullYear()
		return a.date == string_date ; 
	});

	function compare(a,b) {
		if (a.complete_time_secs < b.complete_time_secs)
		  return -1;
		if (a.complete_time_secs > b.complete_time_secs)
		  return 1;
		return 0;
	  }
	  
	  todays_minis = todays_minis.sort(compare);	

	  if (todays_minis.length > 3) {
		first = todays_minis[0].lower_case[0].toUpperCase() + todays_minis[0].lower_case.slice(1,todays_minis[0].lower_case.length)
		second = todays_minis[1].lower_case[0].toUpperCase() + todays_minis[1].lower_case.slice(1,todays_minis[1].lower_case.length)
		third = todays_minis[2].lower_case[0].toUpperCase() + todays_minis[2].lower_case.slice(1,todays_minis[2].lower_case.length)

		document.getElementById("todays-rankings").innerHTML = "🥇: <b>" + first + "</b> (" + todays_minis[0].complete_time_secs + ") 🥈: <b>" + 
			second + "</b> (" + todays_minis[1].complete_time_secs + ") 🥉: <b>" + third + "</b> (" + todays_minis[2].complete_time_secs + ")"
				
		document.getElementById("todays-universe").innerHTML = "As of " +  time + " | " + "Out of " + todays_minis.length + " total competitors" 
	  }
	  else {
			document.getElementById("todays-rankings").innerHTML = " "
			document.getElementById("todays-universe").innerHTML = "As of " +  time + ", only " + todays_minis.length + " people have completed today's mini. Once more than three people have completed the puzzle, daily winners will be assigned." 
	  }
}

function drawChart(data) {

	ranges = ['Last 7 days','Last 30 days','All time']

	var dropDown = d3.select('#dateDropdown')

	dropDown
	  .selectAll("option")
	  .data(ranges)
	  .enter()
	  .append("option")
		.attr("value", function (d) { return d; })
		.text(function (d) {
			return d[0].toUpperCase() + d.slice(1,d.length);
		})
	  .on("change", onchange)

	dropDown.on('change',function() {

		var selectValue = d3.select(this)
			.property('value');

		updateTable(data,selectValue);

	})

	var updateTable = function(data,filter_param) {

		d3.select("#leaderboard-table tbody").remove();
		d3.select("#leaderboard-table thead").remove();

		if(filter_param === "Last 7 days"){
			var dateOffset = (24*60*60*1000) * 7;
			var today = new Date();
			var filter = today - dateOffset
		}

		if(filter_param === "Last 30 days"){
			var dateOffset = (24*60*60*1000) * 30;
			var today = new Date();
			var filter = today - dateOffset
		}

		if(filter_param === "All time"){
			var dateOffset = (24*60*60*1000) * 365;
			var today = new Date();
			var filter = today - dateOffset
		}

		newArr = _.map(data, item => {
			let newItem = _.clone(item);
			newItem.complete_time_secs = parseInt(newItem.complete_time_secs, 10);

			newItem.fmt_date = new Date(newItem.date)
			newItem.day_of_week = newItem.fmt_date.getDay()
			newItem.saturday = newItem.day_of_week == "6"

			return newItem;
		});

		newArr_case = newArr.map(function(a) {
			a.lower_case = a.name.toLowerCase().trim();
			return a;
		});

		//filter data to default value -- Past N days

		newArr_case = newArr_case.filter(function (a) { return a.fmt_date >= filter ; });

		avg_daily_time = _(newArr_case)
				.groupBy('date')
				.map((date, id) => ({
					date: id,
					avg_time : Math.round(_.meanBy(date, 'complete_time_secs')),
				}))
				.value()

		//now merge in average daily times	

		temp_data = newArr_case	

		temp_data = _.map(temp_data, function(obj) {
			return _.assign(obj, _.find(avg_daily_time, {
				date : obj.date
			}));
		});

		temp_data = temp_data.map(function(a) {
			a.diff = a.complete_time_secs - a.avg_time ;
			return a;
		});

		// calculate average times by name

		avg_times = _(newArr_case)
		  .groupBy('lower_case')
		  .map((lower_case, id) => ({
			lower_case: id,
			avg_complete_time: Math.round(_.meanBy(lower_case, 'complete_time_secs')),
			avg_adj_time : Math.round(_.meanBy(lower_case, 'diff')),
			count : _.countBy(lower_case)

		  }))
		  .value()

		// now run average times without saturdays

		function removeDayofWeek(num, obj) {
			for (var key in obj) {
				if (obj[key].day_of_week == "6") {
				  delete obj[key];
				}
			}
			return obj;
		}

		newArr_case_no_sat = removeDayofWeek("6",newArr_case)

		avg_times_no_sat = _(newArr_case_no_sat)
			.groupBy('lower_case')
			.map((lower_case, id) => ({
				lower_case: id,
				avg_complete_time_no_sat: Math.round(_.meanBy(lower_case, 'complete_time_secs')),
				count_no_sat : _.countBy(lower_case)
			}))
			.value()

		// now merge two avg times together (lodash is great!)

		comb_avg_times = _.map(avg_times, function(obj) {
			return _.assign(obj, _.find(avg_times_no_sat, {
				lower_case: obj.lower_case
			}));
		});

		function fix_counts(obj) {
			for (var key in obj) {
				if (obj[key].count  == undefined) {
					obj[key].count = 0
				}
				else {
					obj[key].count = obj[key].count["[object Object]"];
				}
				if (obj[key].count_no_sat  == undefined) {
					obj[key].count_no_sat = 0
				}
				else{
					obj[key].count_no_sat = obj[key].count_no_sat["[object Object]"];
				}
			}
			return obj;
		}

		comb_avg_times = fix_counts(comb_avg_times)
		comb_avg_times = _.orderBy(comb_avg_times, ['avg_complete_time'], ['asc']);

		columns = ['lower_case','avg_complete_time','avg_complete_time_no_sat','avg_adj_time','count','count_no_sat']

		display_cols = ['Name','Average Time','Average Time\n(Excluding Saturday)','Time Adjusted to Daily Average¹','Puzzles Completed','Puzzles Completed\n(Excluding Saturday)']

		// average time scale (no adjustment for average)

		var min = _.minBy(comb_avg_times, function(o) {
				return o.avg_complete_time;
		})
		var min_val = parseInt(min.avg_complete_time)

		var max = _.maxBy(comb_avg_times, function(o) {
				return o.avg_complete_time;
		})
		var max_val = parseInt(max.avg_complete_time)

		var color = d3.scaleLinear()
				.domain([min_val, max_val])
				.range(["#B5D3E7","#003366"]);

		// average time scale (adjusted for average)		

		var min_avg = _.minBy(comb_avg_times, function(o) {
				return o.avg_adj_time;
		})
		var min_avg_val = parseInt(min_avg.avg_adj_time)

		var max_avg = _.maxBy(comb_avg_times, function(o) {
				return o.avg_adj_time;
		})
		var max_avg_val = parseInt(max_avg.avg_adj_time)

		var adj_color = d3.scaleLinear()
				.domain([min_avg_val,0, max_avg_val])
				.range(["#71e554","#ffffff","#ffa500"]);				

		var table = d3.select('#leaderboard-table')
			.append('table')
			//.attr("class", "table table-condensed table-striped");

		var thead = table.append('thead')
		var	tbody = table.append('tbody');

		//// append the header row
		thead.append('tr')
		  .selectAll('th')
		  .data(display_cols).enter()
		  .append('th')
			.text(function (column) { return column; });

		// create a row for each object in the data
		var rows = tbody.selectAll('tr')
		  .data(comb_avg_times)
		  .enter()
		  .append('tr');

		rows.exit().remove();

		// create a cell in each row for each column
		cells = rows.selectAll('td')
			.data(function (row) {
				return columns.map(function (column) {
					return {column: column, value: row[column]};
				});
			})
			.enter()
			.append('td')
			.style("background-color", function(d){ if(d.column == "avg_complete_time" | d.column == "avg_complete_time_no_sat" ) return color(d.value); return d.value; })
			.style("background-color", function(d){ if(d.column == "avg_adj_time" )  return adj_color(d.value); return d.value; })
			.text(function (d) { return d.value; });

		cells.exit().remove();

		//return table;
		fastest_time = _.minBy(_.keys(avg_times), function (o) { return avg_times[o].avg_complete_time; });

		crossword_queen = avg_times[fastest_time].lower_case
		document.getElementById("crossword_queen").innerHTML = "👑 All hail the Crossword Queen (for " + filter_param + "): <b>" + crossword_queen + " </b> 👑"

		}

		updateTable(data,ranges[0]);
}


function matchUp(data) {

	data = data.map(function(a) {
		a.lower_case = a.name.toLowerCase().trim();
		return a;
	});

	list = _.uniqBy(data, function (e) {
		return e.lower_case;
	});

	var names = _.map(list, 'lower_case');

	var sel1 = names[Math.floor(Math.random()*names.length)];

	names = names.sort(function(x,y){ return x == sel1 ? -1 : y == sel1 ? 1 : 0; });

	var first_contender = d3.select('#first_contender')

	first_contender
		.selectAll("option")
		.data(names)
		.enter()
		.append("option")
			.attr("value", function (d) { return d; })
			.text(function (d) {
				return d[0].toUpperCase() + d.slice(1,d.length);
			})

	first_contender.on('change',function() {
		sel1 = d3.select(this)
			.property('value');

		calculateWinners(data,sel1,sel2)

	})

	Array.prototype.remove = function() {
		var what, a = arguments, L = a.length, ax;
			while (L && this.length) {
				what = a[--L];
			while ((ax = this.indexOf(what)) !== -1) {
			this.splice(ax, 1);
			}
		}
		return this;
	};

	var new_names = names.remove(first_contender)

	var sel2 = new_names[Math.floor(Math.random()*new_names.length)];

	new_names = new_names.sort(function(x,y){ return x == sel2 ? -1 : y == sel2 ? 1 : 0; });

	var second_contender = d3.select('#second_contender')

	second_contender
		.selectAll("option")
		.data(new_names)
		.enter()
		.append("option")
			.attr("value", function (d) { return d; })
			.text(function (d) {
				return d[0].toUpperCase() + d.slice(1,d.length);
			})

	second_contender.on('change',function() {
		sel2 = d3.select(this)
			.property('value');

		calculateWinners(data,sel1,sel2)
	})

	calculateWinners(data,sel1,sel2)

}

function calculateWinners(data,cand1,cand2) {

	cand1_data = data.filter(function (a) {
		return a.lower_case == cand1 ;
	});

	cand1_data = _.map(cand1_data, item => {
			let newItem = _.clone(item);
			newItem.cand_1_time = newItem.complete_time_secs

			return newItem;
	});

	cand1 = cand1_data[0].name

	cand1 = cand1[0].toUpperCase() + cand1.slice(1,cand1.length);

	cand2_data = data.filter(function (a) {
		return a.lower_case == cand2 ;
	});

	cand2_data = _.map(cand2_data, item => {
			let newItem = _.clone(item);
			newItem.cand_2_time = newItem.complete_time_secs

			return newItem;
	});

	cand2_name = cand2_data[0].name

	cand2 = cand2_name[0].toUpperCase() + cand2_name.slice(1,cand2_name.length);

	comb = _.map(cand1_data, function(obj) {
				return _.assign(obj, _.find(cand2_data, {
					date: obj.date
				}));
			});

	comb = _.map(comb, item => {
			let newItem = _.clone(item);
			newItem.diff = newItem.cand_1_time - newItem.cand_2_time

			return newItem;
	});

	//filter to only matched dates
	comb = comb.filter(function (a) { return !isNaN(a.diff) ; });

	if (comb.length > 0) {

		avg_diff = _(comb)
					.groupBy('lower_case')
					.map((lower_case, id) => ({
						lower_case: id,
						avg_diff : Math.round(_.meanBy(lower_case, 'diff')),
						count : _.countBy(lower_case)
					}))
					.value()

		function fix_counts_flat(obj) {
			obj[0].count = obj[0].count["[object Object]"];
			return obj;
		}

		avg_diff = fix_counts_flat(avg_diff)

		value = Math.abs(avg_diff[0].avg_diff)

		outcome = 'faster'
		color = "green"

		if (avg_diff[0].avg_diff > 0) {
  			outcome = 'slower';
  			color = "red"
		}

  		text = "On the <b>" + avg_diff[0].count + "</b> days when <b>" + cand1 + "</b> and <b>" + cand2 + "</b> completed the same puzzle, <b>" + cand1 + "</b> was <b>" + value + "</b> seconds <b><font color="+color+"> " + outcome + "</font></b> than <b>" + cand2 + "</b> on average";

  		document.getElementById("result_text").innerHTML = text

		}
		else {
  		text = cand1 + " and " + cand2 + " have yet to complete puzzles on the same day";

  		document.getElementById("result_text").innerHTML = text
		}
		//document.body.replaceChild(p);
}

function drawTrendChart(data) {

	var margin = {top: 30, right: 20, bottom: 30, left: 50},
		width = 700 - margin.left - margin.right,
		height = 500 - margin.top - margin.bottom;

	// parse the date / time
	var parseTime = d3.timeParse("%m/%d/%Y");
	var formatTime = d3.timeFormat("%b %e");

	// format the data
	data.forEach(function(d) {
		d.date_fmt = parseTime(d.date);
		d.complete_time_secs = +d.complete_time_secs;
		new_max = new Date(Math.max(d.date_fmt))
	});

	// set the ranges
	var x = d3.scaleTime()
	   		.domain([new Date(2018, 10, 28), new_max])
			.range([0, width - 75]);
	var y = d3.scaleLinear()
			.range([height, 0]);

	var trend_line = d3.line()
		.x(function(d) { return x(d.date_fmt); })
		.y(function(d) { return y(d.complete_time_secs); })
		//.curve(d3.curveStepAfter);

	var svg = d3.select("#chart").append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform",
		  "translate(" + margin.left + "," + margin.top + ")");

	var colorScale = d3.scaleOrdinal(d3.schemeCategory20);

	//nesting/grouping by name
	// Scale the range of the data
	//x.domain(d3.extent(data, function(d) { return d.date; }));
	y.domain(d3.extent(data, function(d) { return d.complete_time_secs; }));

	data = data.map(function(a) {
			a.lower_case = a.name.toLowerCase().trim();
			return a;
		});

	//sorting data for trendlines

	function sortByDateAscending(a, b) {
			return a.date_fmt - b.date_fmt;
	}

	data = data.sort(sortByDateAscending);

	avg_daily_time = _(data)
			.groupBy('date')
			.map((date, id) => ({
				date: id,
				avg_time : Math.round(_.meanBy(date, 'complete_time_secs')),
			}))
			.value()

	//now merge in average daily times	

	temp_data = data	

	temp_data = _.map(temp_data, function(obj) {
		return _.assign(obj, _.find(avg_daily_time, {
			date : obj.date
		}));
	});

	data = data.map(function(a) {
		a.diff = a.complete_time_secs - a.avg_time ;
		return a;
	});

	// format the data
	avg_daily_time.forEach(function(d) {
		d.date_fmt = parseTime(d.date);
	});						

	dataNest = d3.nest()
			.key(function(d) {
				return d.lower_case;
			})
			.entries(data);	

	var div = d3.select("#chart").append("div")
		.attr("class", "tooltip")
		.style("opacity", 0);

	svg.selectAll(".dot")
		.data(temp_data)
		.enter().append("circle")
		.attr("class", "dot")
		.style("opacity", 0.5)
		.attr("r", 5)
		.style("fill", function(d) { return colorScale(d.name.toLowerCase().trim()); })
		.attr("cx", function(d) { return x(d.date_fmt); })
		.attr("cy", function(d) { return y(d.complete_time_secs); })
		//apply tooltip
		.on("mouseover", function(d) {
					div.transition()
						.duration(200)
						.style("opacity", .9);
					div .html("Date: " + formatTime(d.date_fmt) + "<br/>Name: "  + d.name[0].toUpperCase() + d.name.slice(1,d.name.length) + "<br/>Time: " + d.complete_time_secs)
						.style("left", (d3.event.pageX) + "px")
						.style("top", (d3.event.pageY - 28) + "px");
		})
		.on("mouseout", function(d) {
			div.transition()
				.duration(500)
				.style("opacity", 0);
		});

	svg.selectAll(".daily-dot")
		.data(temp_data)
		.enter()
		.append("circle")
		.attr("class", "daily-dot")
		.style("opacity", 0)
		.attr("r", 5)
		.style("fill", 'black')
		.attr("cx", function(d) { return x(d.date_fmt); })
		.attr("cy", function(d) { return y(d.avg_time); })	

	document.getElementById("chart-header").innerHTML = "Mini Crossword Times"
	document.getElementById("percent_faster").innerHTML = "Hover over names to the right to see specific times."

	var valueline = d3.line()
		.curve(d3.curveMonotoneX)
		.x(function(d) { return x(d.date_fmt); })
		.y(function(d) { return y(d.complete_time_secs); });	

	svg.selectAll(".line")
		.data(dataNest)
		.enter()
		.append("path")
		.attr("class", "line")
		.attr('stroke', '#481567ff')
		.style("opacity", 0)
		.attr("d", function(d){
			return valueline(d.values)
		})

	//create legend
	var legend = svg.selectAll(".legend")
		.data(colorScale.domain())
		.enter().append("g")
		.attr("class", "legend")
		.style("font-size","12px")
		.attr("transform", function(d, i) { return "translate(-60," + i * 14 + ")"; });

	legend.append("rect")
		.attr("x", width)
		.attr("width", 12)
		.attr("height", 12)
		.style("fill", colorScale);

	legend.append("text")
		.attr("x", width + 16)
		.attr("y", 6)
		.attr("dy", ".35em")
		.style("text-anchor", "start")
		.text(function(d) { return d[0].toUpperCase() + d.slice(1,d.length); });

	legend.on("mouseover", function(type) {
		d3.selectAll(".legend")
			.style("opacity", 0.1);
		d3.select(this)
			.style("opacity", 1);		

		//re-coloring daily scores on hover to show relative time compared to average

		temp = temp_data.filter(function (a) { return a.lower_case == type ; });

		var min_avg = _.minBy(temp, function(o) {
				return o.diff;
		})
		var min_val_avg = parseInt(min_avg.diff)

		var max_avg = _.maxBy(temp, function(o) {
				return o.diff;
		})
		var max_val_avg = parseInt(max_avg.diff)

		var comp_neg_color = d3.scaleLinear()
				.domain([0,min_val_avg])
				.range(["#2dc42b","#90ff8e"]);	

			var comp_pos_color = d3.scaleLinear()
				.domain([0,max_val_avg])
				.range(["#ffa3a3","#c42b2b"]);		

			d3.selectAll(".dot")
			.style("opacity", 0.1)
			.filter(function(d) {
				return d.lower_case == type; })
			.style("opacity", 1)
			.style("fill", function(d){ if(d.diff > 0) {
											return comp_pos_color(d.diff)
											}
										else {
											return comp_neg_color(d.diff)
										}	 
									})	
		
		avg_comp = temp.map(function(a) {
			a.faster = a.complete_time_secs < a.avg_time ;
			return a;
		});

		var num = avg_comp.reduce(function (n, record) {
			return n + (record.faster == true);
		}, 0);

		percent_beat_field = (num / avg_comp.length) * 100
		percent_beat_field = percent_beat_field.toFixed(0)

		document.getElementById("percent_faster").innerHTML =  percent_beat_field + "% of puzzles solved by " + type[0].toUpperCase() + type.slice(1,type.length) + " were faster than the field." 

		//show daily average	

		d3.selectAll(".daily-dot")
			.filter(function(d) {
				return d.lower_case == type; })
			.style("opacity", .75);			
			
		//draw trend line	

		//d3.selectAll(".line")
		//	.filter(function(d) { 
		//		return d.key == type; })
		//	.style("opacity", 1)
			

		document.getElementById("chart-header").innerHTML = "Mini Crossword Times  for " + type[0].toUpperCase() + type.slice(1,type.length);

	})
	.on("mouseout", function(type) {
		d3.selectAll(".legend")
			.style("opacity", 1);
		d3.selectAll(".dot")
			.style("fill", function(d) { return colorScale(d.name.toLowerCase().trim()); })
			.style("opacity", .5);
		
		//hide trend line and daily average on mouse out

		d3.selectAll(".line")
			.style("opacity",0)
		d3.selectAll(".daily-dot")
			.style("opacity", 0);		

		document.getElementById("chart-header").innerHTML = "Mini Crossword Times"
		document.getElementById("percent_faster").innerHTML = "Hover over name to the right to see specific times."

	});

	// gridlines in y axis function
	function make_y_gridlines() {
		return d3.axisLeft(y)
			.ticks(5)
	}

	// add the Y gridlines
	svg.append("g")
		.attr("class", "grid")
		.call(make_y_gridlines()
		.tickSize(-width+50)
		.tickFormat("")
	)

	// Add the X Axis
	svg.append("g")
		.attr("class", "axis")
		.attr("transform", "translate(0," + height + ")")
		.call(d3.axisBottom(x)
				.tickFormat(d3.timeFormat("%m/%d/%y")));

	  // Add the Y Axis
	svg.append("g")
		.attr("class", "axis")
		.call(d3.axisLeft(y));

	svg.append("text")
		.attr("transform", "rotate(-90)")
		.attr("y", 0 - margin.left)
		.attr("x",0 - (height / 2))
		.attr("dy", "1em")
		.style("text-anchor", "middle")
		.style("font-size","12px")
		.style("font-family","Helvetica")
		.text("Complete time in seconds");

}

//load data from google sheet doc

var publicSpreadsheetUrl = 'https://docs.google.com/spreadsheets/d/1W9jTFsCLpBuAUa3AhvwHM92bWwqpsoWXzJ9k9_UuvjQ/pubhtml';

function renderSpreadsheetData() {
	Tabletop.init( { key: publicSpreadsheetUrl,
				 callback: draw,
				 simpleSheet: true } )
}

function draw(data, tabletop) {

	results = tabletop.sheets("master mini times")
	main_data = results.elements

	drawChart(main_data);
	drawTrendChart(main_data);
	matchUp(main_data);
	daily_ranking(main_data);
}

renderSpreadsheetData();
