function Game() {

  var ROUND_DURATION = 20; // 76
  var LOBBY_DURATION = 10; // 24

  var GAME_WIDTH = 1920;
  var GAME_HEIGHT = 1080;

  var _this = this;
  var currentFrameRequest = 0;
  var flyers = [];
  var asteroids = [];
  var droppers = [];
  var stageDiv = {};
  var stageBounds = {};
  var roundCountdown = -LOBBY_DURATION;
  var onForceDisconnectCallback;
  var winCallback;
  var loseCallback;
  var pointsCallback;
  var stunCallback;

  /* ================= */
  /* PHASER GAME LAYER */
  /* ================= */
  var game = new Phaser.Game(GAME_WIDTH, GAME_HEIGHT, Phaser.AUTO, 'stage', { preload: phaserPreload, create: phaserCreate, update: phaserUpdate, render: phaserRender }, true);

  /* Phaser variables */
  var flyerSpeedVertical = 30;
  var flyerSpeedHorizontal = 25;

  var debugMode = true;
  var debugFlyerData = {userid:'debug-user-id12345', usercolor:'#FD6E83', nickname:'Debug', socketid:'debug-socket-id-abc'};
  var cursors;
  var brickPlatforms;
  var allFlyersGroup;
  var winnerFlyer;
  var winnerCrown;

  var brickEmitter;

  var ashManager = null;
  var ashEmitter = null;
  var wind = 0;

  function phaserPreload() {

    /* Phaser game settings */

    // Prevent game from pausing when browser loses focus
    game.stage.disableVisibilityChange = true;

    /* Preload all assets */

    game.load.image('block', 'img/vines-1.png');
    game.load.image('block-damaged', 'img/vines-2.png');
    game.load.image('block-damaged-2', 'img/vines-3.png');
    game.load.image('block-piece', 'img/vines-piece.png');

    game.load.image('debug-block', 'img/sprites/square1.png');
    game.load.image('crown', 'img/sprites/crown.png');

    game.load.atlasJSONHash('led', 'img/sprites/led.png', 'img/sprites/led.json');

    game.load.path = 'assets/particlestorm/particles/';

    game.load.image('ash-1', 'img/ash__1.png');
    game.load.image('ash-2', 'img/ash__2.png');
    game.load.image('ash-3', 'img/ash__3.png');

    // Fonts
    // game.load.bitmapFont('carrier_command', 'fonts/bitmapFonts/carrier_command.png', 'fonts/bitmapFonts/carrier_command.xml');

  }

  function phaserCreate() {

    // Physics system
    game.physics.startSystem(Phaser.Physics.NINJA);

    // Turn down gravity a bit (default was 0.2)
    game.physics.ninja.gravity = 0.07;

    // Keyboard for debug
    cursors = game.input.keyboard.createCursorKeys();
    spaceButton = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
    spaceButton.onDown.add(() => {
      _this.controlTap(debugFlyerData);
    }, this);

    winnerCrown = game.add.sprite(0, 0, 'crown');
    winnerCrown.name = 'crown';
    winnerCrown.anchor.x = 0.5;
    winnerCrown.anchor.y = 1.9;
    winnerCrown.scale.setTo(0.14, 0.14);

    // Prepare particle effects
    brickEmitter = game.add.emitter(0, 0, 100);
    brickEmitter.physicsBodyType = Phaser.Physics.NINJA;
    brickEmitter.enableBody = true;
    brickEmitter.makeParticles('block-piece', 0, 100, true, true);
    brickEmitter.gravity = 620;
    brickEmitter.bounce.setTo(0.2, 0.45);
    brickEmitter.setScale(0.45, 0.65, 0.45, 0.65);
    brickEmitter.setAlpha(0.6, 0.85);

    // Game objects
    allFlyersGroup = game.add.group();

    // Generate brick tile pattern.
    createBrickPlatforms();

    // Setup particle layer
    ashManager = game.plugins.add(Phaser.ParticleStorm);

    var ashLayer = {
      image: ['ash-1','ash-2','ash-3'],
      lifespan: 50000,
      vx: { min: -8, max: 8, control: [{ x: 0, y: 0.1 }, { x: 0.3, y: 0.05 }, { x: 0.6, y: 0.12 }, { x: 0.9, y: 0.1 }] },
      vy: { min: 0.01, max: 0.025, control: [{ x: 0, y: 0.01 }, { x: 0.3, y: 0.0023 }, { x: 0.6, y: 0.0019 }, { x: 0.9, y: 0.0023 }] },
      scale: { min: 1, max: 1.5 },
      rotation: { initial: -90, value: 180, control: [{ x: 0, y: 0 }, { x: 0.2, y: 0.5 }, { x: 0.4, y: 1 }, { x: 0.44, y: 0.5 }, { x: 1, y:0 }] },
    };

    ashManager.addData('ashLayer', ashLayer);

    emitter = ashManager.createEmitter();

    emitter.force.y = 0.22;

    emitter.addToWorld();

    emitter.emit('ashLayer', [-50, GAME_WIDTH + 50], -10, { repeat: -1, frequency: 1456 });

    if (debugMode == true) {
      _this.addPlayer(debugFlyerData);
    }

  }

  function addPhaserBody(userdata) {

    var userColor = parseInt(userdata.usercolor.replace(/^#/, ''), 16);

    var spawnX = Math.round(Math.random() * 600) + 600;
    var spawnY = 300 - Math.round(Math.random() * 150);
    var flyerGroup = allFlyersGroup.create(spawnX, spawnY, '');
    flyerGroup.width = 40;
    flyerGroup.height = 58;

    var flyerSprite = game.add.sprite(0, 0, 'led');

    // Animation
    var frames = Phaser.Animation.generateFrameNames('idle_', 0, 4, '.png', 4);
    flyerSprite.animations.add('idle', frames, 10, true, false);

    frames = Phaser.Animation.generateFrameNames('side_', 1, 6, '.png', 4);
    flyerSprite.animations.add('fly', frames, 10, true, false);

    var flyerInner = game.add.sprite(0, 0, 'led');

    // Inner/white
    frames = Phaser.Animation.generateFrameNames('idle-inner', 1, 5, '.png', 0);
    flyerInner.animations.add('idle', frames, 10, true, false);

    frames = Phaser.Animation.generateFrameNames('side-inner', 1, 6, '.png', 0);
    flyerInner.animations.add('fly', frames, 10, true, false);

    flyerSprite.animations.play('fly');
    flyerSprite.tint = userColor;
    flyerSprite.setScaleMinMax(-0.8, 0.8, 0.8, 0.8);

    flyerSprite.anchor.x = 0.5;
    flyerSprite.anchor.y = 0.5;

    flyerInner.anchor.x = 0.5;
    flyerInner.anchor.y = 0.48;

    flyerInner.animations.play('fly');
    flyerInner.setScaleMinMax(-0.8, 0.8, 0.8, 0.8);

    // Swipe collision object.
    var flyerRange = game.add.sprite(0, 0, '');

    flyerRange.anchor.x = 0.5;
    flyerRange.anchor.y = 0.5;

    flyerRange.width = 150;
    flyerRange.height = 100;

    // Combine into single flyer sprite
    flyerGroup.addChild(flyerRange);
    flyerGroup.addChild(flyerSprite);
    flyerGroup.addChild(flyerInner);

    game.physics.ninja.enableAABB(flyerGroup, false);

    // Speed cap for flyers (default was 8)
    flyerGroup.body.maxSpeed = 9;

    // Make brick platforms a little sticky.
    // Default friction was 0.05
    flyerGroup.body.friction = 0.1;

    // How much air drag affects flyer
    // Default drag was 1.0 (0-1 range)
    flyerGroup.body.drag = 0.988;

    // Set bouncincess of bricks
    // Default is 0.3
    flyerGroup.body.bounce = 0.36;

    return [flyerGroup.body, flyerSprite, flyerInner];

  }

  function clearAllBricks() {

    brickPlatforms.removeAll(true);

  }

  function createBrickPlatforms() {

    if (brickPlatforms) {
      clearAllBricks();
    } else {
      brickPlatforms = game.add.group();
    }

    var brickRects = FishRandomBrickLevel(); // Available from ./BrickTileMap.js

    var platform;

    for (var i = 0; i < brickRects.length; i++) {

      var br = brickRects[i];

      var platform = brickPlatforms.create(br.x, br.y, 'block');
      platform.width = br.w;
      platform.height = br.h;

      game.physics.ninja.enable(platform, 3);
      platform.body.immovable = true;
      platform.body.gravityScale = 0;

    }

  }

  function phaserUpdate() {

    // Collisions between flyers and brick platforms
    game.physics.ninja.collide(allFlyersGroup, brickPlatforms);

    //  Make a current that blows left or right slowly changing strength and direction
    // wind = Math.max(Math.min(wind + (Math.random() - 0.5) * 0.02, 0.25), -0.25);
    // emitter.force.x = wind;

    // Brick pieces... (not working)
    // game.physics.ninja.collide(brickEmitter, brickPlatforms);

    for (var i = 0; i < flyers.length; i++) {

      controllerInput(flyers[i]);

    }

    if (debugMode == true) {
      keyboardInput(flyers[0]);
    }

  }

  function controllerInput(flyer) {

    const fBody = flyer.phaserBody;
    const fSprite = flyer.phaserSprite;
    const fInner = flyer.phaserInner;

    if (flyer.ax < 0) {

      fBody.moveLeft(flyerSpeedHorizontal * Math.abs(flyer.ax));
      fSprite.animations.play('fly');
      fInner.animations.play('fly');
      flyer.dir = -1.0;
      fSprite.scale.setTo(flyer.dir, 1.0);
      fInner.scale.setTo(-flyer.dir, 1.0);

    } else if (flyer.ax > 0) {

      fBody.moveRight(flyerSpeedHorizontal * Math.abs(flyer.ax));
      fSprite.animations.play('fly');
      fInner.animations.play('fly');
      flyer.dir = 1.0;
      fSprite.scale.setTo(flyer.dir, 1.0);
      fInner.scale.setTo(-flyer.dir, 1.0);

    } else {

      fSprite.animations.play('idle');
      fInner.animations.play('idle');

    }

    if (flyer.ay < 0) {

      fBody.moveUp(flyerSpeedVertical * Math.abs(flyer.ay));

    } else if (flyer.ay > 0) {

      fBody.moveDown(flyerSpeedVertical * Math.abs(flyer.ay));

    }

  }

  function keyboardInput(flyer) {

    if (flyers.length == 0) return;

    const fBody = flyer.phaserBody;
    const fSprite = flyer.phaserSprite;

    if (cursors.left.isDown) {

      fBody.moveLeft(flyerSpeedHorizontal);
      fSprite.animations.play('fly');
      flyer.dir = -1.0;
      fSprite.scale.setTo(flyer.dir, 1.0);

    } else if (cursors.right.isDown) {

      fBody.moveRight(flyerSpeedHorizontal);
      fSprite.animations.play('fly');
      flyer.dir = 1.0;
      fSprite.scale.setTo(flyer.dir, 1.0);

    } else {

      fSprite.animations.play('idle');

    }

    if (cursors.up.isDown) {

      fBody.moveUp(flyerSpeedVertical);

    } else if (cursors.down.isDown) {

      fBody.moveDown(flyerSpeedVertical);

    }

  }

  function crownNewWinner(flyer) {
    // If not already wearing crown, add.
    /* if (flyer.phaserBody.sprite.children.indexOf(winnerCrown) == -1) {
       // sprite is a part of groupA
       flyer.phaserBody.sprite.addChild(winnerCrown);
     }*/
  }

  function flyerBrickSwipe(f) {

    // Detect if any bricks were hit

    // Default to swing from upper left of flyer
    var swipeRadius = 72;
    var swipeCircle = {x:f.phaserBody.x, y:f.phaserBody.y + (f.phaserBody.height * 0.125), r:swipeRadius};

    // If facing right, swipe from middle right
    if (f.dir > 0) swipeCircle.x += f.phaserBody.width;

    var brick;
    var testRect;
    var didBustBrick = false;

    for (var i = brickPlatforms.children.length - 1; i >= 0; i--) {

      brick = brickPlatforms.children[i];

      // Skip bricks that are
      // already smashed
      if (!brick.visible) {
        continue;
      }

      testRect = {x:brick.x, y:brick.y, w:brick.width, h:brick.height};

      if (rectCircleCollision(swipeCircle, testRect)) {
        damageBrick(brick, f);
        didBustBrick = true;
      }

    }

    return didBustBrick;

  }

  function damageBrick(brick, flyer) {

    console.log('damageBrick', brick.key);
    if (brick.key == 'block') {
      brick.loadTexture('block-damaged');

      console.log('1');
    } else if (brick.key == 'block-damaged') {
      console.log('2');
      brick.loadTexture('block-damaged-2');

    } else {
      console.log('3');
      brick.kill();

      // TODO - If we don't plan to
      // turn this brick back 'on'
      // we should destroy, not kill.
      // Otherwise, bring back into
      // gameplay with 'revive'

      if (roundCountdown > 0) {

        var brickPts = 10;
        flyer.score += brickPts;

        // Emit points event to scorer
        if (pointsCallback) {
          pointsCallback.call(undefined, flyer.socketid);
        }

        releasePoints(brickPts, flyer.color, brick.x, brick.y - 15, flyer.dir);
      }

      particleBrickBurst(brick.x, brick.y, flyer.dir);

    }
  }

  function particleBrickBurst(x,y,dir) {

    //  Position the emitter where the event was
    brickEmitter.x = x;
    brickEmitter.y = y;

    brickEmitter.setXSpeed(20 * dir, 400 * dir);

    //  The first parameter sets the effect to "explode" which means all particles are emitted at once
    //  The second gives each particle a 2000ms lifespan
    //  The third is ignored when using burst/explode mode
    //  The final parameter (10) is how many particles will be emitted in this single burst

    // brickEmitter.start(true, 5500, null, 10);

    brickEmitter.explode(5555, Math.round(Math.random() * 2 + 3));

  }

  function phaserLevelReset() {

    // Revive all killed bricks.
    /*    for (var i = brickPlatforms.children.length - 1; i >= 0; i--) {
          var brick = brickPlatforms.children[i];
          brick.revive();
          brick.loadTexture('block');
        }*/

    // Generate brick tile pattern.
    createBrickPlatforms();

  }

  function phaserRender() {

    if (debugMode == true) {

      game.debug.text('flyer count: ' + flyers.length, 256, 64);

      if (flyers.length > 0) {
        game.debug.body(flyers[0].phaserBody.sprite, '#F00', false);
        game.debug.spriteBounds(flyers[0].phaserBody.sprite.getChildAt(1), '#0FF', false);

        // game.debug.spriteBounds(flyers[0].phaserBody.sprite.getChildAt(0), '#F0F', false);
        game.debug.body(flyers[0].phaserBody.sprite.getChildAt(0), '#F0F', false);
      }

    }

  }

  /* ============== */
  /* PUBLIC METHODS */
  /* ============== */

  this.init = function(_stageDiv) {

    stageDiv = _stageDiv;
    this.start();

  };

  this.setCallbacks = function(forceDisconnect, win, lose, points, stun) {

    onForceDisconnectCallback = forceDisconnect;
    winCallback = win;
    loseCallback = lose;
    pointsCallback = points;
    stunCallback = stun;

  };

  this.start = function() {

    // Start game loop
    currentFrameRequest = window.requestAnimationFrame(gameLoop);

    // Begin releasing asteroids
    setInterval(function() {

      if (flyers.length > 0 && roundCountdown > 0) {
        releaseAsteroid();

        // Extra asteroids for more players
        for (var i = 0; i < Math.floor(flyers.length / 3); i++) {

          releaseAsteroid();

        }

      }

    }, 4500);

    // Begin updating scoreboard & round countdowns
    setInterval(function() {

      if (flyers.length > 0) updateScoreboard();

      if (roundCountdown < 0) {

        roundCountdown++;

        $('#round-countdown').text(Math.abs(roundCountdown));

        if (roundCountdown === 0) {

          startRound();
          $('#game-countdown').removeClass('show');

        }

      } else if (roundCountdown > 0) {

        roundCountdown--;

        // Only display countdown below 15 seconds
        if (roundCountdown <= 15) {
          $('#game-countdown').text(Math.abs(roundCountdown));
          $('#game-countdown').addClass('show');
        }

        if (roundCountdown === 0) {

          endRound();

        }
      }

    }, 1000);

  };

  this.stop = function() {

    // Stop game loop
    window.cancelAnimationFrame(currentFrameRequest);

    // TODO: If this ever gets used, stop all timers

  };

  this.setBounds = function(x,y,w,h) {

    stageBounds = {left:x, ceil:y, floor:h, right:w};

    // Add padding for flyer height
    stageBounds.floor -= 46;

  };

  this.addPlayer = function(data) {

    // Add new flyer div to stage
    $(stageDiv).append('<div id="flyer_' + data.userid + '" class="flyer" ><p style="color:' + data.usercolor + ';">' + data.nickname + '</p><img id="fist" src="img/hero_fist.png"/><img id="idle" src="img/kid_idle.png"/><img id="fly" src="img/kid_fly.png"/></div>');
    var flyerDiv = $('#flyer_' + data.userid);

    // Pop in
    var startX = Math.random() * (stageBounds.right - 100) + 50;
    var startY = Math.random() * (stageBounds.floor - 300) + 50;
    TweenLite.set($(flyerDiv), { css: { left:startX, top:startY } });
    TweenLite.from($(flyerDiv), 1, { css: { scale:0 }, ease:Elastic.easeOut });

    // Flash colored ring around new player for a few seconds
    var highlightRing = $('<div class="highlightRing" style="color:' + data.usercolor + ';"></div>');
    $(flyerDiv).append(highlightRing);
    TweenMax.set($(highlightRing), { css: { opacity:0.0 } });
    TweenMax.to($(highlightRing), 0.2, { css: { opacity:1, scale:0.9 }, ease:Power1.easeOut, delay:0.3, repeat:11, yoyo:true, onComplete: removeElement, onCompleteParams:[highlightRing] });

    var phaserObj = addPhaserBody(data);
    var pBody = phaserObj[0];
    var pSprite = phaserObj[1];
    var pInner = phaserObj[2];

    // Add to game loop
    var newFlyer = {    userid:data.userid,
                        socketid:data.socketid,
                        div:flyerDiv,
                        flyDiv:$(flyerDiv).children('#fly'),
                        idleDiv:$(flyerDiv).children('#idle'),
                        fistDiv:$(flyerDiv).children('#fist'),
                        phaserBody: pBody,
                        phaserSprite: pSprite,
                        phaserInner: pInner,
                        nickname:data.nickname,
                        color:data.usercolor,
                        deadCount: 0,
                        score:0,
                        stunned:false,
                        gas:false,
                        dir:1,
                        x:startX,
                        y:startY,
                        ax:0,
                        ay:0,
                        vx:0,
                        vy:-0.1,
                    };

    flyers.push(newFlyer);

  };

  this.removePlayer = function(data) {

    console.log('Game.removePlayer: ' + data);

    // Remove flyer from stage, phaser system, and game loop
    var flyer = lookupFlyer(data.userid);
    if (flyer !== undefined) {

      // Remove div from html
      $(flyer.div).remove();

      // Remove Phaser sprite
      flyer.phaserBody.sprite.destroy();

    }

    // Remove from flyers array.
    for (i = flyers.length - 1; i >= 0; i--) {
      if (flyers[i].userid == data.userid) flyers.splice(i, 1);
    }

  };

  this.controlVector = function(data) {

    var f = lookupFlyer(data.userid);
    if (f === undefined) return;

    if (data.magnitude === 0) {
      // No acceleration
      f.gas = false;
    } else {
      // Is accelerating
      f.gas = true;

    }

    // Set acceleration for phaser
    f.ax = Math.cos(data.angle) * data.magnitude;
    f.ay = Math.sin(data.angle) * data.magnitude;

  };

  this.controlTap = function(data) {

    var f = lookupFlyer(data.userid);
    if (f === undefined) return;
    if (f.stunned) return;

    // Swipe action
    TweenLite.set(f.fistDiv, { css: { rotation: -60 * f.dir, opacity: 1, transformOrigin:'50% 100% 0' } });
    TweenMax.to(f.fistDiv, 0.4, { css: { rotation: 330 * f.dir, opacity: 0 }, ease: Power3.easeOut });

    // Destroy asteroids
    var pnts = smashAsteroids(f.phaserBody.x + 17, f.phaserBody.y + 25, f.dir, f.color);
    if (pnts > 0) {
      f.score += pnts;

      // Emit points event to scorer
      if (pointsCallback) {
        pointsCallback.call(undefined, f.socketid);
      }
    }

    // Stun others
    // var didStun = attemptStun(f);

    // Phaser attempt swipe (for bricks)
    flyerBrickSwipe(f);

  };

  /* =============== */
  /* PRIVATE METHODS */
  /* =============== */

  function gameLoop() {

    // Update game objects here...
    flyers.forEach(function(flyer) {

      if (flyer.stunned === true) {

        // TODO: Freeze phaser physics object

        // Skip to next flyer
        return;
      }

      if (flyer.gas === true) {

        flyer.deadCount = 0;

      } else {

        flyer.deadCount++;

        if (flyer.deadCount > 1800) {

          // Never kill debug flyer.
          if (flyer.userid == 'debug-user-id12345') {
            flyer.deadCount = 0;
            return;
          }

          // Assume player has lost connection. Remove from game.
          // Emit disconnect event to node
          // 1800 frames at 60fps is about 30 seconds
          if (onForceDisconnectCallback) {

            onForceDisconnectCallback.call(undefined, {userid:flyer.userid, socketid:flyer.socketid});

          }

          return;

        }
      }

      // Update position based on Phaser physics body
      TweenLite.set($(flyer.div), { css: { left:flyer.phaserBody.x - (flyer.phaserBody.width * 0.6), top:flyer.phaserBody.y - (flyer.phaserBody.height * 0.9) } });

    });

    // Wait for next frame
    currentFrameRequest = window.requestAnimationFrame(gameLoop);

  }

  function smashAsteroids(mineX, mineY, smashDir, ptColor) {

    var damageDealt = 0;

    for (a = asteroids.length - 1; a >= 0; a--) {

      var ast = asteroids[a];
      var aL = parseInt($(ast.div).css('left'), 10) + (ast.diam * 0.5);
      var aT = parseInt($(ast.div).css('top'), 10) + (ast.diam * 0.5);

      if (dist(aL, aT, mineX, mineY) < ast.diam * 1.15) {

        // Successful strike

        if (ast.diam < 200) {

          // Normal asteroid requires one hit
          damageDealt = ast.health;
          ast.health = 0;
          releasePoints(damageDealt, ptColor, aL - 10, aT - (ast.diam * 0.5) + 3, smashDir);

        } else {

          // Monster asteroid requires multiple swings
          damageDealt = 10 + Math.ceil(Math.random() * 15);
          ast.health -= damageDealt;
          releasePoints(damageDealt, ptColor, aL - 10, aT - (ast.diam * 0.5) - 10, 0);

        }

        if (ast.health <= 0) {

          // Remove from stage
          TweenLite.to($(ast.div), 0.3, { css: { opacity:0 }, onComplete: removeElement, onCompleteParams:[ast.div] });

          // Remove from game loop
          asteroids.splice(a, 1);

          // Animate explosion
          explodeAsteroid(aL - (ast.diam * 0.5), aT - (ast.diam * 0.25), ast.diam, smashDir);

        }

        return damageDealt;

      }
    }

    return damageDealt;

  }

  function attemptStun(attackingFlyer) {

    var didStun = false;
    var stunRadius = 70;

    var of;
    var oX;
    var oY;

    for (i = flyers.length - 1; i >= 0; i--) {

      // Skip attacking flyer and stunned flyers
      if (flyers[i].userid == attackingFlyer.userid || flyers[i].stunned === true) {
        continue;
      }

      otherFlyer = flyers[i];
      oX = parseInt(otherFlyer.phaserBody.x, 10);
      oY = parseInt(otherFlyer.phaserBody.y, 10);

      if (dist(oX, oY, attackingFlyer.x, attackingFlyer.y) < stunRadius) {

        // Successful stun!
        otherFlyer.stunned = true;
        TweenMax.to($(otherFlyer.div), 0.2, { css: { opacity:0.5 }, ease:Power2.easeInOut, repeat:12, yoyo:true, onComplete: liftStun, onCompleteParams:[otherFlyer] });

        if (stunCallback) {
          stunCallback.call(undefined, otherFlyer.socketid);
        }

      }

    }

    return didStun;

  }

  function liftStun(flyer) {
    flyer.stunned = false;
    TweenLite.set($(flyer.div), { css: { opacity:1 } });
  }

  function startRound() {

    // Hide new-round screen
    $('#new-round').hide();
    $('#join-msg').show();

    // TweenMax.to( $("#join-msg"), 7.3, { css: { bottom:130 }, ease:Power2.easeInOut, repeat:99, yoyo:true } );
    roundCountdown = ROUND_DURATION;

    // Reset everyone's score
    resetScoreboard();

    // Flip background to UpsideDown
    document.querySelector("#flippy-wrapper").classList.toggle("flip");

    // Reset bricks and physics
    phaserLevelReset();

  }

  function endRound() {

    // Flip background to living room
    document.querySelector("#flippy-wrapper").classList.toggle("flip");

    // Clear gameplay
    // Show new-round screen
    $('#new-round').show();
    $('#join-msg').hide();
    roundCountdown = -LOBBY_DURATION;
    clearAsteroids();
    clearAllBricks();
    updateScoreboard();
    $('#game-countdown').text(' ');

    if (flyers.length > 1) {

      // Emit win event to top-scorer
      if (winCallback) {
        winCallback.call(undefined, flyers[0].socketid);
        crownNewWinner(flyers[0]);
      }

      // Emit lose event to every other player
      if (loseCallback) {
        for (var i = 1; i < flyers.length; i++) {
          loseCallback.call(undefined, flyers[i].socketid);
        }
      }

    }

  }

  function updateScoreboard() {

    // Sort by score
    flyers.sort(function(a,b) { return parseFloat(b.score) - parseFloat(a.score); });

    if (roundCountdown < 0) {
      // TEMP (shouldn't reach outside game stage)
      $('#player-list').empty();
      for (var i = 0; i < flyers.length; i++) {
        $('#player-list').append($('<li>').html('<span style="color:' + flyers[i].color + ';">' + flyers[i].nickname + ' </span> &nbsp; ' + flyers[i].score));
      }
    }

  }

  function resetScoreboard() {
    for (var i = 0; i < flyers.length; i++) {
      flyers[i].score = 0;
    }
  }

  function releasePuff(flyer) {

    // Add to stage
    var pDiv = $('<div class="puff-ring" style="color:' + flyer.color + '; background-color:' + flyer.color + ';"></div>');
    $(stageDiv).append(pDiv);

    var p = polarity(flyer.ax);
    var tX = flyer.phaserBody.x + (p * -12) + 15;
    var tY = flyer.phaserBody.y + 55;

    // Starting point
    TweenLite.set($(pDiv), { css: { opacity: 0.35, left:tX, top:tY} });

    tX += Math.random() * 16 - 8;
    tY += Math.random() * 10 - 5 + 10;

    // Scale and fade
    TweenLite.to($(pDiv), 0.15, { css: { left:tX, top:tY }, ease:Power3.easeOut });
    TweenLite.to($(pDiv), 0.2, { css: { opacity:0.0 }, ease:Power3.easeIn, onComplete: removeElement, onCompleteParams:[pDiv] });

  }

  function releasePoints(val, col, x, y, dir) {

    // Add to stage
    var pDiv = $('<p class="points" style="color:' + col + ';">+' + val + '</p>');

    $(stageDiv).append(pDiv);

    // Starting point
    TweenLite.set($(pDiv), { css: { left:x, top:y, scale:0.25 } });

    // Target point
    x += Math.random() * 80 - 40 + (dir * 115);
    y -= 45;

    // Scale and fade
    TweenLite.to($(pDiv), 0.35, { css: { scale:1, left:x, top:y }, ease:Power3.easeOut });
    TweenLite.to($(pDiv), 0.5, { css: { opacity:0 }, delay:0.35, ease:Power1.easeIn, onComplete: removeElement, onCompleteParams:[pDiv] });

  }

  function releaseAsteroid() {

    // Add new asteroid to stage
    var astType = '';
    var diam = 0;
    var healthNum = 1;
    var r = Math.random();

    // r = 0.99; // temp

    if (r < 0.5) {
      astType = 'c';
      healthNum = Math.ceil(Math.random() * 3);
      diam = 160;
    } else if (r < 0.85) {
      astType = 'b';
      diam = 150;
    } else if (r < 0.975) {
      astType = 'd';
      diam = 165;
    } else {
      astType = 'a';
      diam = 490;
    }



    var aDiv = $('<div class="asteroid" style=""><img src="img/asteroids/' + astType + '-asteroid-dark.png"/></div>');

    $(stageDiv).append(aDiv);

    // Scale asteroids between 50-100% orig size
    var scale = 0.5 + (Math.random() * 0.5);
    diam *= scale;

    // Release point
    // var startX = Math.random() * (stageBounds.right - 60) + 30;
    // var startY = Math.random() * (stageBounds.floor - 60) + 30;

    var startX = Math.random() * (game.width - 160) + 30;
    var startY = Math.random() * (stageBounds.floor - 60) + 30;

    TweenLite.set($(aDiv), { css: {scale:scale, left:startX, top:startY } });

    var health = roundToNearest(diam / 2, 5);

    // Pop in
    TweenLite.from($(aDiv), 1.5, { css: { scale:0, opacity:0 }, ease:Elastic.easeOut });
    TweenLite.from($(aDiv), 10, { css: { left:startX + (Math.random() * 200 - 100), top:startY + (Math.random() * 200 - 100), rotation:Math.random() * 90 - 45 } });

    var ast = {div:aDiv, x:startX, y:startY, diam:diam, health:health };
    asteroids.push(ast);

  }

  function explodeAsteroid(x, y, diam, dir) {

    // Replace with chunks of asteroid dispersing
    for (var i = 0; i < 5; i++) {
      var astNum = Math.ceil(Math.random() * 6);

      var aDiv = $('<div class="asteroid" style=""><img src="img/asteroids/a' + astNum + '.png"/></div>');

      $(stageDiv).append(aDiv);

      // Starting point
      var scale = Math.random() * 0.15 + 0.2;
      if (diam > 300) scale *= 2;
      TweenLite.set($(aDiv), { css: { left:x, top:y, scale:scale } });

      // Tween from center
      TweenLite.to($(aDiv), 0.4, { css: { left:(x + Math.random() * 200 - 100) + (dir * 100), top:(y + Math.random() * 240 - 120), rotation:Math.random() * 250 - 125}, ease:Power2.easeOut });

      // Fade out and remove chunk
      TweenLite.to($(aDiv), 0.4, { css: { opacity:0 }, delay:0.1, onComplete: removeElement, onCompleteParams:[aDiv] });

    }

  }

  function clearAsteroids() {

    for (a = asteroids.length - 1; a >= 0; a--) {

      var ast = asteroids[a];

      // Fade out
      TweenLite.to($(ast.div), 0.5, { css: { opacity:0 }, delay:Math.random() * 0.5, onComplete: removeElement, onCompleteParams:[ast.div] });

      // Remove from game loop
      asteroids.splice(a, 1);

    }

  }

  /**
   *
   * Utility Methods
   *
   */

  function lookupFlyer(id) {
    for (var i = 0; i < flyers.length; i++) {
      if (flyers[i].userid == id) return flyers[i];
    }
  }

  function removeElement(el) {
    $(el).remove();
  }

  function mapRange(value, low1, high1, low2, high2) {
    return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
  }

  function dist(x, y, x0, y0) {
    return Math.sqrt((x -= x0) * x + (y -= y0) * y);
  }

  function clamp(val, min, max) {
      return Math.min(Math.max(val, min), max);
    }

  function roundToNearest(val, n) {
    return n * Math.round(val / n);
  }

  // Return true if the rectangle and circle are colliding
  function rectCircleCollision(circle, rect) {

    var distX = Math.abs(circle.x - rect.x - rect.w / 2);
    var distY = Math.abs(circle.y - rect.y - rect.h / 2);

    if (distX > (rect.w / 2 + circle.r)) {
      return false;
    }

    if (distY > (rect.h / 2 + circle.r)) {
      return false;
    }

    if (distX <= (rect.w / 2)) {
      return true;
    }

    if (distY <= (rect.h / 2)) {
      return true;
    }

    var dx = distX - rect.w / 2;
    var dy = distY - rect.h / 2;

    return (dx * dx + dy * dy <= (circle.r * circle.r));

  }

  function polarity(x) {
    // Convert to a number
    x = +x;
    if (x === 0 || isNaN(x)) {
      return x;
    }

    return x > 0 ? 1 : -1;
  }

}
