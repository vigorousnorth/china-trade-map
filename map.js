var canvas, pathGenerator, width, height;

var zooming = false, zoomedOut = false, linesGoOut = true,
	rotatemap, mapTop, mineralListHeight; // to be defined when DOM loads or window size changes, for scroll events

var projection = d3.geoEckert3(), projection2 = d3.geoEckert3();

const chinaCoord = [103.8,37];

const nations = d3.json("https://unpkg.com/world-atlas@1/world/50m.json")
  .then( geodata => {
  	
  	window.scrollTo(0,0);

  	let container = d3.select('#map');
  	
  	geodata = topojson.simplify( topojson.presimplify(geodata), 0.02 );
  	
		var graticule = d3.geoGraticule();

		var arcs, svg = container.append('svg');

		currentProjection = projection;

		var infoBox = container.append('div').attr('id','mapInfoBoxContainer')
			.selectAll('div.mapInfoBox')
			.data(tradeData)
			.enter().append('div').attr('class','mapInfoBox hidden')
			.attr('id', function(d) {return "ib_" + d.name.replace(/\s+/g, '').toLowerCase();});

		infoBox.append('h4').attr('class','infoBox_Country')
			.html(function(d) { return d.name; });
		infoBox.append('h5')
			.attr('class',function(d) { return 'infoBox_Mineral ' + d.info.element.replace(/\s+/g, '').toLowerCase(); })
			.html(function(d) { return d.info.element; });
		
		let acquisitions = infoBox.append('p').attr('class','infoBox_Acquisitions')
			.html("China acquires additional ");
		acquisitions.append('span').attr('class', 'infoBox_Production')
			.html(function(d) { return "production: " + d.info.production; });
		acquisitions.append('br');
		acquisitions.append('span').attr('class', 'infoBox_Reserves')
			.html(function(d) { return "reserves: " + d.info.reserves; });

		infoBox.append('p').attr('class',"infoBox_Chatter")
			.html(function(d) {return d.info.chatter;});


		drawMaps();
	  
		function drawMaps() {

			mapTop = document.getElementById("map").getBoundingClientRect().top;
			mineralListHeight = document.getElementById("mineralsTable").getBoundingClientRect().height;
 
			scrollInit();
	  	
	  	width = d3.select("#map").node().getBoundingClientRect().width;
	  	height = Math.min(width * 0.6, window.innerHeight);

	  	if (width<650) {
	  			// infoBox.classed('hidden',false);
	  			let ibh = d3.select('#mapInfoBoxContainer').node().getBoundingClientRect().height;
	  			d3.select("#map").style('height', (height+ibh) + 'px');
	  			d3.select("#mineralsTable").style('top', -(height+ibh-10) + 'px');
	  			d3.selectAll('div.mapInfoBox').attr('style', "top: 0px; left:0px;") 


		  } else { 
		  		d3.select("#map").style('height', height + 'px');
					d3.select("#mineralsTable").style('top', -(height) + 'px');

					outerHeight = d3.select('#map').node().getBoundingClientRect().height;
		  		
		  		d3.selectAll('div.mapInfoBox').attr('style', function(d) { 
					let x = (d.ib_x*width).toFixed(2), y = (d.ib_y*outerHeight).toFixed(2);
					return "left:" + x + "px; top:" + y +"px;" 
				});
			}

	  	document.getElementById("section2").style.height = (height + mineralListHeight) * 2.5 + 'px';	
		 	
		 	svg.attr('width', width).attr('height', height);

	    svg.selectAll('*').remove();

			projection
		  	.fitSize([width, height], {
			    type: "Sphere"
			  })
	      .translate([width/2, height/2 ])
		    .rotate([-105, -35])
		  	.scale(width / 1.2);

		  projection2
		  	.fitSize([width, height-30], {
			    type: "Sphere"
			  })
	      .translate([width/2, height/2])
		    .scale(width/5.1).rotate([-5,0]);

		  pathGenerator = d3.geoPath().projection(currentProjection);
	
			var nations = svg.append('g').attr("id","nationPaths").selectAll("path.nation")
				.data(topojson.feature(geodata, geodata.objects.countries).features)
				.enter().append('path')
				.attr("d", pathGenerator)
				.style("stroke", d => (d.id == "156") ? "rgba(255,0,0,0.5)" : null ) 
				.style("stroke-width", d => (d.id == "156") ? "1.5px" : null ) 
				.attr("class", d => {
					let thisPlace = findElement(tradeData, "id", d.id);
					if (thisPlace) { 
						return "nation land highlight " + thisPlace.info.element.replace(/\s+/g, '').toLowerCase();
					} 
					else { return "nation land" }
				})
				.lower();

			svg.append("path")
		    .datum({ type: "Sphere" })
		    .attr("d", pathGenerator)
		    .classed("sphere", true)
		    .lower();

		  svg.append("path")
		    .datum(graticule)
		    .attr("class", "graticule")
		    .attr('fill','none').attr('stroke','#ddd')
		    .attr("d", pathGenerator)
		    .lower();

		  var arcClass = (zoomedOut || zooming) ? "arc " : "arc hidden ";

		  arcs = svg.append("g").attr('id','tradeArcs')
		  	.selectAll('path.arc')
		  	.data( tradeData, JSON.stringify )
		  	.enter()
		    .append('path')
		    .attr('class', d => arcClass + d.info.element.replace(/\s+/g, '').toLowerCase() )
		    .attr('d', d =>  drawCurve(currentProjection(chinaCoord), currentProjection([d.lng, d.lat]), currentProjection(d.mid) ) );
		}

		function rotateMaps() {

			zooming = true;

			currentProjection = projection2;

			d3.selectAll('.mapInfoBox')
				.transition()
				.delay(3000)
				.style("opacity",1)
				.on('end', function() { d3.select(this).classed('hidden',false); });

			svg
				.selectAll("path")
				.transition()
				.ease(d3.easeLinear)
				.duration(5000)
				.style("stroke-width", null ) 
				.attrTween("stroke-dasharray", tweenDash)
				.attrTween("d", function(geoJsonFeature) {
		      // for the current element being transitioned, figure out which svg "map" it belongs to
		      // this needs to happen because each svg "map" uses a different projection and geoPathGenerator
		      var geoPathGenerator = pathGenerator;

		      var rotateInterpolator = d3.interpolate(
		        projection.rotate(),
		        projection2.rotate()
		      );

		      var scaleInterpolator = d3.interpolate(
		        projection.scale(),
		      	projection2.scale()
		      );

        	// t goes from 0 to 1
        	function globeTimer(t) {
        		return Math.min(1, Math.max(0,t*2.5-0.5));
        	}

		      // find out if the landmasses or one of the circles is the element currently being transitioned
		      if ( (d3.select(this).classed("land")) || (d3.select(this).classed("graticule")) ) {
		        return function(t) {

		          geoPathGenerator.projection()
		          	.rotate(rotateInterpolator(globeTimer(t)))
		          	.scale(scaleInterpolator(globeTimer(t)));

		          return geoPathGenerator(geoJsonFeature) || "";
		        }
		      } else if (d3.select(this).classed("arc")) {
		      		
		      		let d = d3.select(this).datum();

		      		d3.select(this).classed('hidden',false);

		      		return function(t) {
		      			let p = projection
			          	.rotate(rotateInterpolator(globeTimer(t)))
		          		.scale(scaleInterpolator(globeTimer(t)));

			          return drawCurve(p(chinaCoord) , p([d.lng, d.lat]), p(d.mid));
		      		}
		      } else {
		        return "";
		      }
		    }).on('end', function() { tradeLinesAnimating = false; zooming=false; zoomedOut = true; });


		}

		function tweenDash() {

			tradeLinesAnimating = true; 

			if (d3.select(this).classed("arc")) {
				var l = this.getTotalLength(),
					dashInvisible = "0," + 10*l,
					dashVisible = l + "," + l,
				  i = linesGoOut ? d3.interpolateString(dashInvisible, dashVisible)
				  	: d3.interpolateString(dashVisible, dashInvisible)
				return function (t) { return i( Math.min(1, Math.max(0,t*1.5-0.5)) ); };
			} else { return ""; }
		}

		function toggleTradeLines() {				
			if (!tradeLinesAnimating) {
				svg.selectAll("path.arc").transition().duration(1000) 
					.attrTween("stroke-dasharray", tweenDash)
					.on('end', function() { tradeLinesAnimating = false;});
			}
		}

		function areLinesDrawn() {
			 // Function will return TRUE if the current path's stroke array is a solid line, false otherwise.

			var s = svg.selectAll("path.arc");
    	var currentStrokeArray = s.attr('stroke-dasharray').split(','); 
    	
    	return (currentStrokeArray[0] === currentStrokeArray[1]);   	
		}

		function scrollInit() {

			window.addEventListener('scroll', function(e) {    // event triggers on scrolling


			    var current = window.scrollY;
			    var mineralsTableFloor = document.getElementById("mineralsTable").getBoundingClientRect().bottom;

			    //console.log('y',current); 
			    if ((current > (mapTop + mineralListHeight)) && !zoomedOut && !zooming) {
			    	rotateMaps();
			    } else if 
			    	(zoomedOut && (mineralsTableFloor > 20)) {
			    	
				  
				  	// if the trade lines are drawn and aren't animating, hide them: 
				  	if (!tradeLinesAnimating & areLinesDrawn() ) { linesGoOut = !areLinesDrawn(); toggleTradeLines(); }

			    	d3.selectAll('.mapInfoBox').style('opacity', 0);

			    } else if (zoomedOut && (mineralsTableFloor <= 0)) {

			    	
				  	// if the trade lines aren't drawn or animating, show them again:
				  	if (!tradeLinesAnimating && !areLinesDrawn() ) { linesGoOut = !areLinesDrawn(); toggleTradeLines(); }

			    	var ib = d3.selectAll('.mapInfoBox');

			    	// if the infoboxes aren't visible, show them again:
			    	if (ib.style('opacity') == 0) { ib.transition().delay(250).duration(500).style('opacity',1); }

			    }
			});
		}

		window.addEventListener("resize", drawMaps);
 
});



function drawCurve(origin, dest, mid) {

	// move cursor to origin
	let pathstr =  "M" + origin[0] + ',' + origin[1] 
	// smooth curve to offset midpoint
	 + "S" + mid[0] + "," + mid[1]
	//smooth curve to destination	
	 + "," + dest[0] + "," + dest[1];

	 return pathstr;
}


function findElement(arr, propName, propValue) {
  var returnVal = false;
  for (var i=0; i < arr.length; i++) {
    if (arr[i][propName] == propValue) {
          returnVal = arr[i];
      }
  } 
  return returnVal;
}