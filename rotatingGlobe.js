Promise.all([
  d3.json(
    "https://gist.githubusercontent.com/jwasilgeo/21a6a6b67e9dc14f28fa73bb2beb4a6e/raw/e29f0ef8f8d9832598b5429d6c5e2c6fa9d33666/F1_Circuits_2018_topojson.json"
  ),
  d3.json("https://unpkg.com/world-atlas@1.1.4/world/110m.json")
]).then(function(loadedTopoJsonResults) {
  var f1CircuitsTopoJson = loadedTopoJsonResults[0];
  var f1CircuitsGeoJson = topojson.feature(
    f1CircuitsTopoJson,
    f1CircuitsTopoJson.objects.F1_Circuits_2018
  );

  var worldTopoJson = topojson.simplify(
    topojson.presimplify(loadedTopoJsonResults[1]),
    0.5
  );
  var worldGeoJson = topojson.feature(
    worldTopoJson,
    worldTopoJson.objects.land
  );

  var orthographicMap = createOrthographicMap(f1CircuitsGeoJson, worldGeoJson);

  rotateMaps(f1CircuitsGeoJson, orthographicMap, 0);
});

function createOrthographicMap(f1CircuitsGeoJson, worldGeoJson) {
  var svg = d3.select("svg.orthographic-map");
  var dimensions = svg.attr("viewBox").split(" ");
  var width = dimensions[2];
  var height = dimensions[3];

  var projection = d3.geoBromley().fitSize([width, height], {
    type: "Sphere"
  });

  var geoPathGenerator = d3.geoPath(projection);

  svg
    .selectAll("path")
    .data(f1CircuitsGeoJson.features)
    .enter()
    .append("path")
    .attr("d", function(geoJsonFeature) {
      var geoJsonCircle = d3
        .geoCircle()
        .center(d3.geoCentroid(geoJsonFeature))
        .radius(1.5)();
      return geoPathGenerator(geoJsonCircle);
    })
    .classed("circuit-path", true);

  svg
    .append("path")
    .datum(worldGeoJson)
    .attr("d", geoPathGenerator)
    .classed("land", true)
    .lower();

  svg
    .append("path")
    .datum({
      type: "Sphere"
    })
    .attr("d", geoPathGenerator)
    .classed("sphere", true)
    .lower();

  return {
    svg: svg,
    geoPathGenerator: geoPathGenerator
  };
}

function rotateMaps(geoJsonCollection, orthographicMap, repeatCount) {
  var nextGeoJsonFeature = geoJsonCollection.features[0];
  var nextCentroid = d3.geoCentroid(nextGeoJsonFeature);
  var nextRotationDestination = [-nextCentroid[0], -nextCentroid[1]];

  orthographicMap.svg
    .selectAll("path")
    .transition()
    .duration(1250)
    .delay(500)
    .attrTween("d", function(geoJsonFeature) {
      // for the current element being transitioned, figure out which svg "map" it belongs to
      // this needs to happen because each svg "map" uses a different projection and geoPathGenerator
      var geoPathGenerator = orthographicMap.geoPathGenerator;

      var interpolator = d3.interpolate(
        geoPathGenerator.projection().rotate(),
        nextRotationDestination
      );

      // find out if the landmasses or one of the circles is the element currently being transitioned
      if (d3.select(this).classed("land")) {
        return function(t) {
          geoPathGenerator.projection().rotate(interpolator(t));
          return geoPathGenerator(geoJsonFeature) || "";
        };
      } else if (d3.select(this).classed("circuit-path")) {
        return function(t) {
          geoPathGenerator.projection().rotate(interpolator(t));
          var geoJsonCircle = d3
            .geoCircle()
            .center(d3.geoCentroid(geoJsonFeature))
            .radius(1.5)();
          return geoPathGenerator(geoJsonCircle) || "";
        };
      } else {
        return "";
      }
    })
    .on("start", function(d, idx, nodeList) {
      while (idx < nodeList.length - 1) {
        return;
      }

      orthographicMap.svg
        .selectAll("path.circuit-path")
        .style("stroke", "steelblue")
        .style("fill", "steelblue")
        .filter(function(geoJsonFeature) {
          return (
            geoJsonFeature.properties.Name ===
            nextGeoJsonFeature.properties.Name
          );
        })
        .style("stroke", "red")
        .style("fill", "red")
        .raise();

      d3.select(".circuit-name").text(nextGeoJsonFeature.properties.Name);
    })
    .on("end", function(d, idx, nodeList) {
      while (idx < nodeList.length - 1) {
        return;
      }

      repeatCount++;

      addToStackingMap(nextGeoJsonFeature, function() {
        // reset all the circles back to the original color when starting the entire cycle over again
        // and clear the stacked circuits
        if (repeatCount === geoJsonCollection.features.length) {
          // rinse and repeat from the beginning after a delay

          setTimeout(function() {
            d3.select(".info").html("All done! Start over.");

            // all circles on the world maps back to blue
            orthographicMap.svg
              .selectAll("path.circuit-path")
              .transition()
              .style("stroke", "steelblue")
              .style("fill", "steelblue");

            repeatCount = 0;

            // clear the stacking map circuit stack
            clearStackingMap(function() {
              d3
                .select(".info")
                .html('find &amp; stack... <span class="circuit-name"></span>');

              geoJsonCollection.features.push(
                geoJsonCollection.features.shift()
              );
              rotateMaps(geoJsonCollection, orthographicMap, repeatCount);
            });
          }, 4000);
        } else {
          // repeat to continue to the next circuit location
          geoJsonCollection.features.push(geoJsonCollection.features.shift());
          rotateMaps(geoJsonCollection, orthographicMap, repeatCount);
        }
      });
    });
}

function clearStackingMap(callback) {
  d3
    .select("svg.stacking-map")
    .selectAll("path")
    .each(function(d, outerIndex, nodeList) {
      d3
        .select(this)
        .transition()
        .delay(100 * outerIndex)
        .ease(d3.easeBackIn)
        .style("transform", "scale(0.01)")
        .on("end", function() {
          while (outerIndex < nodeList.length - 1) {
            return;
          }

          d3
            .select("svg.stacking-map")
            .selectAll("path")
            .remove();

          callback();
        });
    });
}

function addToStackingMap(geoJsonFeature, callback) {
  var svg = d3.select("svg.stacking-map");
  var dimensions = svg.attr("viewBox").split(" ");
  var width = dimensions[2];
  var height = dimensions[3];

  var newCircuitPath = svg
    .append("path")
    .datum(geoJsonFeature)
    .attr("d", function(geoJsonFeature) {
      var featureCentroid = d3.geoCentroid(geoJsonFeature);
      var featureCentroidRotation = [-featureCentroid[0], -featureCentroid[1]];

      var projection = d3
        .geoMercator()
        // half of the parent <svg> width and height
        .translate([width / 2, height / 2])
        // this scale seems to work well for all the circuits
        .scale(2400 * width)
        // the projection rotation is what is most important for stacking features and
        // it is calculated by finding the centroid coordinates of the geojson circuit
        .rotate(featureCentroidRotation);

      // the geoPathGenerator is responsible for generating the "d" attribute that a <path> element needs
      var geoPathGenerator = d3.geoPath(projection);

      return geoPathGenerator(geoJsonFeature);
    })
    .classed("circuit-path", true)
    .raise();

  newCircuitPath
    .style("transform", "scale(0.01)")
    .style("stroke", "red")
    .style("stroke-width", 2)
    .style("opacity", 0.7)
    .transition()
    .duration(500)
    .ease(d3.easeBackOut)
    .style("transform", null)
    .on("end", function() {
      newCircuitPath
        .transition()
        .style("transform", null)
        .style("stroke", null)
        .style("stroke-width", null)
        .style("opacity", null)
        .on("end", function() {
          callback();
        });
    });
}
