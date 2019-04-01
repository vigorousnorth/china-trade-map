var canvas, path, width, height;

var mapTop;

var projection = d3.geoBromley();

const chinaCoord = [103.8,37];

var tradeData = [

	{	"name": "United States", "id": "840", 
		"lat": 40, "lng": -98, "mid": [45,100],
		"info": {
			"element" : "Rare Earth Elements",
			"production": "<1%",
			"reserves": "6%",
			"chatter": "China's acquisition of Mountain Pass, the only U.S. REE mine, in 2017 gave Shenghe Resources strategic control."
		} 
	},
	{	"name": "Australia", "id": "036", 
		"lat": -26.3, "lng": 134, "mid": [160,52],
		"info": {
			"element" : "Rare Earth Elements",
			"production": "<1%",
			"reserves": "6%",
			"chatter": "China's acquisition of Mountain Pass, the only U.S. REE mine, in 2017 gave Shenghe Resources strategic control."
		}
	},
	{	"name": "South Africa", "id": "710", 
		"lat": -28.8, "lng": 24.4, "mid": [20,45],
		"info": {
			"element" : "Vanadium",
			"production": "<1%",
			"reserves": "6%",
			"chatter": "China's acquisition of Mountain Pass, the only U.S. REE mine, in 2017 gave Shenghe Resources strategic control."
		} 
	},
	{	"name": "Mozambique", "id": "508", 
		"lat": -18, "lng": 35.5, "mid": [40,25],
		"info": {
			"element" : "Graphite",
			"production": "<1%",
			"reserves": "6%",
			"chatter": "China's acquisition of Mountain Pass, the only U.S. REE mine, in 2017 gave Shenghe Resources strategic control."
		} 
	}
]

const nations = d3.json("https://unpkg.com/world-atlas@1/world/50m.json")
  .then( geodata => {

  	geodata = topojson.simplify( topojson.presimplify(geodata), 0.02 );
		
		mapTop = document.getElementById("map").offsetTop();
		console.log(mapTop);
  	
  	var width = d3.select("#map").node().getBoundingClientRect().width;
  	var height = width * 0.6;

	 	svg = d3.select('#map').append('svg')
	 		.attr('width', width)
      .attr('height', height);
	  
		var graticule = d3.geoGraticule();

	  projection
	  	.rotate([-105, -35])
	  	.fitSize([width, height], {
		    type: "Sphere"
		  })
      // .translate([width / 2, height / 2])
      // .precision(0.01)
	    .scale(width / 1.2);

	  pathGenerator = d3.geoPath().projection(projection);
	  
		svg.append('g').attr("id","nationPaths").selectAll("path.nation")
			.data(topojson.feature(geodata, geodata.objects.countries).features)
			.enter().append('path')
			.attr("d", pathGenerator)
			.attr("class", d => {
				let thisPlace = findElement(tradeData, "id", d.id);
				if (thisPlace) { 
					return "nation land highlight " + thisPlace.info.element.replace(/\s+/g, '').toLowerCase();
				} 
				else { return "nation land" }
			})
			.lower();


		// console.log(tradeData);
		

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
	  

	function rotateMaps() {

		var nextRotationDestination = [-5,0];

		// drawarcs();

		var arcs = svg.append("g").selectAll('path.arc').data( tradeData, JSON.stringify );

	  arcs.enter()
	    .append('path')
	    .attr('class', d => 'arc ' + d.info.element.replace(/\s+/g, '').toLowerCase() )
	    .attr('d', d =>  drawCurve(projection(chinaCoord), projection([d.lng, d.lat]), projection(d.mid) ) )
	    .attr('opacity',0)
	    .transition()
	    .duration(2000)
	    .delay(1000)
	    .attr('opacity',1)
	    

		svg
			.selectAll("path")
			.transition()
			.duration(2500)
			.delay(500)
			.attrTween("d", function(geoJsonFeature) {
	      // for the current element being transitioned, figure out which svg "map" it belongs to
	      // this needs to happen because each svg "map" uses a different projection and geoPathGenerator
	      var geoPathGenerator = pathGenerator;

	      var rotateInterpolator = d3.interpolate(
	        geoPathGenerator.projection().rotate(),
	        nextRotationDestination
	      );

	      var scaleInterpolator = d3.interpolate(
	        geoPathGenerator.projection().scale(),
	        width/6
	      );

	      // find out if the landmasses or one of the circles is the element currently being transitioned
	      if ( (d3.select(this).classed("land")) || (d3.select(this).classed("graticule")) ) {
	        return function(t) {
	          geoPathGenerator.projection()
	          	.rotate(rotateInterpolator(t))
	          	.scale(scaleInterpolator(t));

	          return geoPathGenerator(geoJsonFeature) || "";
	        }
	      } else if (d3.select(this).classed("arc")) {
	      		
	      		let d = d3.select(this).datum();
	      		return function(t) {
	      			let p = projection
		          	.rotate(rotateInterpolator(t))
		          	.scale(scaleInterpolator(t));

		          return drawCurve(p(chinaCoord) , p([d.lng, d.lat]), p(d.mid));
	      		}
	      } else {
	        return "";
	      }
	    });

	}

	var interval = setTimeout(rotateMaps, 2000);


	// var interval2 = setTimeout(drawarcs, 4000);
 
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