// This array can be exported from the brick-mapper system... (https://github.com/scimusmn/brick-mapper)

var strangerLevel1 = [{'x':-100.0,'y':0.0,'w':70,'h':70}];

// Collect all levels (Weight randomness by adding levels multiple times...)
// var levels = [level1, level2, level3, level4, level5, level6, level7, level8, level8, level9, level4, level4, level4, level7, level7];

var levels = [strangerLevel1];

// De-center all bricks (brick-mapper exports as centered)
deCenterBricks(strangerLevel1);

// IMPORTANT. In order to use in physics engine,
// we need to de-center the bricks as they come from brick mapper.
function deCenterBricks(arr) {
  var levelBricks = arr;
  for (var i = 0; i < levelBricks.length; i++) {
    var b = levelBricks[i];
    b.x -= (b.w / 2);
    b.y -= (b.h / 2);
  }

}

// Call externally to grab random level data.
function FishRandomBrickLevel() {

  var randomLevelIndex = Math.floor(Math.random() * levels.length);

  console.log('BrickTileMap.FishRandomBrickLevel() : random level index:', randomLevelIndex);

  return levels[randomLevelIndex];

}
