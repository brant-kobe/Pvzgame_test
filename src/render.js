/* 视图层：使用逻辑坐标绘制，并根据设备像素比提升 Canvas 清晰度。 */
(function (Game) {
  "use strict";
  var C = Game.config, S = Game.state, U = Game.utils;
  var canvas = document.getElementById("game"), ctx = canvas.getContext("2d"), pixelRatio = 1;
  Game.view = { canvas: canvas, ctx: ctx };

  function resizeCanvas() {
    pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
    var rect = canvas.getBoundingClientRect(), displayWidth = rect.width || C.width, displayHeight = rect.height || C.height;
    C.height = U.clamp(Math.round(C.width * displayHeight / displayWidth), 640, 960);
    canvas.width = Math.round(C.width * pixelRatio);
    canvas.height = Math.round(C.height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    if (Game.layoutWorld) Game.layoutWorld();
  }

  function panel(x, y, w, h, fill, stroke, radius) {
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, .24)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    U.roundedRect(ctx, x, y, w, h, radius || 12, fill, stroke);
    ctx.restore();
  }

  function text(value, x, y, font, color, align) {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align || "left";
    ctx.fillText(value, x, y);
  }

  function badge(label, x, y, w, color) {
    U.roundedRect(ctx, x, y, w, 20, 10, "rgba(5, 16, 23, .72)", "rgba(255,255,255,.12)");
    text(label, x + w / 2, y + 14, "bold 10px Segoe UI, Microsoft YaHei", color, "center");
  }

  function drawSkillSlot(x, y, w, h, skill, icon, color) {
    U.roundedRect(ctx, x, y, w, h, 5, skill.unlocked ? "rgba(18, 39, 49, .96)" : "rgba(5, 16, 23, .58)", skill.unlocked ? color : "rgba(153,205,218,.2)");
    if (skill.unlocked) {
      text(icon, x + 8, y + 13, "bold 11px Segoe UI, Microsoft YaHei", color, "center");
      text("Lv." + skill.level, x + w - 2, y + 12, "bold 7px Segoe UI, Microsoft YaHei", C.colors.text, "right");
      var ratio = -1, activeWindow = skill.activeDuration || skill.duration;
      if (skill.active && activeWindow > 0) ratio = U.clamp(1 - (skill.activeElapsed || 0) / activeWindow, 0, 1);
      else if (skill.fireInterval && skill.fireTimer > 0) ratio = U.clamp(1 - skill.fireTimer / skill.fireInterval, 0, 1);
      if (ratio >= 0) {
        U.roundedRect(ctx, x + 3, y + h - 4, w - 6, 2, 1, "rgba(255,255,255,.14)");
        U.roundedRect(ctx, x + 3, y + h - 4, (w - 6) * ratio, 2, 1, skill.active ? "#ffffff" : color);
      }
    } else text("—", x + w / 2, y + 13, "10px Segoe UI, Microsoft YaHei", C.colors.muted, "center");
  }

  function findCoreSkill(id) {
    var list = C.coreSkills || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function drawSkillSlots(p) {
    var order = p.skillOrder || [], spec = C.skillSlots, x = C.width + spec.offsetX;
    for (var slot = 0; slot < C.maxSkillSlots; slot++) {
      var y = spec.y + slot * (spec.height + spec.gap), id = order[slot];
      if (id) {
        var entry = findCoreSkill(id) || {};
        drawSkillSlot(x, y, spec.width, spec.height, p.skills[id], entry.icon || "?", entry.color || C.colors.purple);
      } else drawSkillSlot(x, y, spec.width, spec.height, { unlocked: false }, "", C.colors.muted);
    }
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  Game.draw = function () {
    Game.drawBackground();
    Game.drawRangeLines();
    Game.drawEnemies(null, "ground");
    Game.drawEnemyShots();
    Game.drawArmoredCars();
    Game.drawWhirlwinds();
    Game.drawHailStorms();
    Game.drawFuelPools();
    Game.drawDrones();
    Game.drawEnemies(null, "air");
    Game.drawWall();
    Game.drawSkillRing();
    Game.drawFuelShells();
    Game.drawBullets();
    Game.drawPlayer();
    Game.drawEffects();
    Game.drawRangePreview();
    Game.drawHud();
    Game.updateTestControls();
    if (S.screen === "menu") Game.drawMenu();
    if (S.screen === "levelSelect") Game.drawLevelSelect();
    if (S.screen === "zombieCodex") Game.drawZombieCodex();
    if (S.screen === "skillCodex") Game.drawSkillCodex();
    if (S.screen === "login") Game.drawLogin();
    if (S.screen === "account") Game.drawAccount();
    if (S.screen === "attributes") Game.drawAttributes();
    if (S.screen === "equipment") Game.drawEquipment();
    if (S.screen === "equipmentBag") Game.drawEquipmentBag();
    if (S.screen === "wall") Game.drawWallPanel();
    if (S.screen === "gems") Game.drawGemsPanel();
    if (S.screen === "upgrade") Game.drawUpgrade();
    if (S.screen === "paused") Game.drawPause();
    if (S.screen === "victory" || S.screen === "defeat" || S.screen === "retreat") Game.drawResult();
    if (S.screen === "menu" || S.screen === "levelSelect" || S.screen === "victory" || S.screen === "defeat" || S.screen === "retreat") Game.drawAccountBanner();
    if (Game.syncAccountDialog) Game.syncAccountDialog();
  };

  Game.drawBackground = function () {
    var gradient = ctx.createLinearGradient(0, 0, 0, C.height);
    gradient.addColorStop(0, "#102f42");
    gradient.addColorStop(.55, "#0a1f2c");
    gradient.addColorStop(1, "#050d14");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, C.width, C.height);

    var glow = ctx.createRadialGradient(C.width / 2, 116, 8, C.width / 2, 116, 260);
    glow.addColorStop(0, "rgba(58, 168, 192, .16)");
    glow.addColorStop(1, "rgba(58, 168, 192, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, C.width, C.height);

    ctx.strokeStyle = "rgba(153, 205, 218, .055)";
    ctx.lineWidth = 1;
    for (var x = 15; x < C.width; x += 36) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, C.height); ctx.stroke(); }
    for (var y = 86; y < C.height; y += 36) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(C.width, y); ctx.stroke(); }

    // 远处的城市剪影，增加纵深但不干扰战斗对象。
    ctx.fillStyle = "rgba(3, 12, 18, .42)";
    for (var building = 0; building < 8; building++) {
      var buildingX = building * 52 - 8, buildingH = 38 + (building * 29) % 80;
      ctx.fillRect(buildingX, 310 - buildingH, 42, buildingH);
      ctx.fillStyle = "rgba(104, 216, 255, .06)";
      for (var windowY = 324 - buildingH; windowY < 306; windowY += 16) ctx.fillRect(buildingX + 9, windowY, 5, 5);
      ctx.fillStyle = "rgba(3, 12, 18, .42)";
    }

    ctx.fillStyle = "rgba(255, 255, 255, .025)";
    for (var i = 0; i < 7; i++) ctx.fillRect((i * 67 + 18) % C.width, 125 + (i * 83) % C.height, 26, 10);
    var lineY = S.player ? S.player.y + 24 : C.height - 52;
    ctx.strokeStyle = "rgba(255, 107, 107, .28)";
    ctx.setLineDash([5, 7]);
    ctx.beginPath(); ctx.moveTo(0, lineY); ctx.lineTo(C.width, lineY); ctx.stroke();
    ctx.setLineDash([]);
  };

  Game.drawRangeLines = function () {
    if (!S.session || !S.session.testArena) return;
    var keys = [["far", "远"], ["mid", "中"], ["near", "近"]];
    ctx.save();
    ctx.setLineDash([7, 6]);
    ctx.lineWidth = 1.5;
    keys.forEach(function (item) {
      var y = Game.getRangeLine(item[0]);
      if (y < 0 || y > C.height) return;
      ctx.strokeStyle = "rgba(255, 107, 107, .4)";
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(C.width, y); ctx.stroke();
      text(item[1] + " " + C.ranges[item[0]], 5, y + 12, "bold 9px Segoe UI, Microsoft YaHei", "rgba(255, 150, 150, .9)");
    });
    ctx.setLineDash([]);
    ctx.restore();
  };

  Game.drawRangePreview = function () {
    var id = S.skillRangePreview;
    if (!id || !S.player || (S.screen !== "playing" && S.screen !== "testArena")) return;
    if ((S.player.skillOrder || []).indexOf(id) < 0) return;
    var entry = findCoreSkill(id) || {}, color = entry.color || C.colors.cyan, wall = S.wall;
    var line = Game.getSkillRangeLine(id), wallLine = wall ? wall.y - wall.height / 2 : C.height;
    var rangeName = Game.getSkillRangeName(id);
    var label = { far: "远距离", mid: "中距离", near: "近距离" }[rangeName] || "远距离";
    var inRange = 0;
    S.enemies.forEach(function (enemy) { if (enemy.y >= line) inRange++; });
    ctx.save();
    ctx.globalAlpha = .13;
    ctx.fillStyle = color;
    ctx.fillRect(0, line, C.width, Math.max(0, wallLine - line));
    ctx.globalAlpha = .95;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([9, 5]);
    ctx.beginPath(); ctx.moveTo(0, line); ctx.lineTo(C.width, line); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    U.roundedRect(ctx, 10, wallLine - 32, 216, 22, 8, "rgba(5, 16, 23, .88)", color);
    text((entry.icon || "?") + " " + (entry.name || id) + " · " + label + " " + (C.ranges[rangeName] || 0), 20, wallLine - 17, "bold 11px Segoe UI, Microsoft YaHei", color);
    text("范围内 " + inRange + " 只", C.width - 12, wallLine - 17, "bold 10px Segoe UI, Microsoft YaHei", C.colors.text, "right");
    ctx.restore();
  };

  Game.drawPlayer = function () {
    var p = S.player;
    if (!p) return;
    var body = Game.sprites.images.playerBody, rifle = Game.sprites.images.playerRifle;
    var bodySpec = C.sprites.playerBody, rifleSpec = C.sprites.playerRifle;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.imageSmoothingEnabled = true;
    if (ctx.imageSmoothingQuality) ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "rgba(0, 0, 0, .45)";
    ctx.beginPath(); ctx.ellipse(2, bodySpec.height - bodySpec.anchorY - 3, bodySpec.width * .36, 7, 0, 0, Math.PI * 2); ctx.fill();
    if (rifle && rifleSpec) {
      ctx.save();
      ctx.translate(rifleSpec.mountX, rifleSpec.mountY);
      ctx.rotate(p.aimAngle + Math.PI / 2);
      ctx.drawImage(rifle, -rifleSpec.anchorX, -rifleSpec.anchorY, rifleSpec.width, rifleSpec.height);
      ctx.restore();
    }
    if (body) ctx.drawImage(body, -bodySpec.anchorX, -bodySpec.anchorY, bodySpec.width, bodySpec.height);
    if (rifleSpec) {
      ctx.save();
      ctx.translate(rifleSpec.mountX, rifleSpec.mountY);
      ctx.rotate(p.aimAngle + Math.PI / 2);
      ctx.fillStyle = "#ffd166"; ctx.shadowColor = "#ffd166"; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(0, -C.muzzleDistance, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  };

  function drawChainBolt(x1, y1, x2, y2, alpha) {
    function trace() { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = "round";
    ctx.shadowColor = "#a97bff"; ctx.shadowBlur = 16;
    ctx.lineWidth = 6.5; ctx.strokeStyle = "rgba(120, 78, 235, .5)"; trace();
    ctx.shadowColor = "#d9c4ff"; ctx.shadowBlur = 10;
    ctx.lineWidth = 2.4; ctx.strokeStyle = "#c9a1ff"; trace();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1; ctx.strokeStyle = "rgba(248, 242, 255, .95)"; trace();
    ctx.restore();
  }

  Game.drawBullets = function () {
    S.bullets.forEach(function (bullet) {
      var length = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy) || 1;
      var angle = Math.atan2(bullet.vy, bullet.vx), trail = 8, bulletColor = bullet.color || "#ffffff";
      ctx.save();
      ctx.strokeStyle = bulletColor;
      ctx.globalAlpha = .42;
      ctx.lineWidth = bullet.radius * .75;
      ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(bullet.x, bullet.y); ctx.lineTo(bullet.x - bullet.vx / length * trail, bullet.y - bullet.vy / length * trail); ctx.stroke();
      ctx.globalAlpha = 1;
      // 普通子弹始终保持白色细长椭圆；后续特殊弹种可通过 bullet.color 扩展外观。
      ctx.translate(bullet.x, bullet.y);
      ctx.rotate(angle);
      ctx.fillStyle = bulletColor;
      ctx.shadowColor = bulletColor; ctx.shadowBlur = 9;
      ctx.beginPath(); ctx.ellipse(0, 0, bullet.radius * 1.9, bullet.radius * .62, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
    (S.skillProjectiles || []).forEach(function (projectile) {
      if (projectile.type === "chainLightning") {
        var chainTime = (S.session && S.session.elapsed) || 0;
        var chainPoints = [{ x: projectile.originX, y: projectile.originY }];
        projectile.nodes.forEach(function (node, index) {
          if (index > projectile.next) return;
          var alive = S.enemies.indexOf(node.target) >= 0;
          if (index === projectile.next && !alive) return;
          var point = { x: alive ? node.target.x : node.x, y: alive ? node.target.y : node.y, pending: index >= projectile.next };
          chainPoints.push(point);
        });
        for (var link = 1; link < chainPoints.length; link++) {
          var head = chainPoints[link];
          drawChainBolt(chainPoints[link - 1].x, chainPoints[link - 1].y, head.x, head.y, head.pending ? .5 : .95);
          if (head.pending) continue;
          ctx.save();
          ctx.globalAlpha = .7; ctx.strokeStyle = "#efe6ff"; ctx.shadowColor = "#b98cff"; ctx.shadowBlur = 12; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(head.x, head.y, 11, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = .32; ctx.lineWidth = 3.5;
          ctx.beginPath(); ctx.arc(head.x, head.y, 17 + Math.sin(chainTime * 22 + link) * 2.5, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
        }
        ctx.globalAlpha = 1;
        return;
      }
      if (projectile.type === "electromagnetic") {
        var target = projectile.target && S.enemies.indexOf(projectile.target) >= 0 ? projectile.target : projectile;
        var strikeX = target.x, strikeY = target.y;
        ctx.save();
        ctx.globalAlpha = projectile.delay > 0 ? .52 : .92;
        ctx.shadowColor = "#9bffff"; ctx.shadowBlur = 14; ctx.strokeStyle = "#d8ffff"; ctx.lineWidth = 3; ctx.lineJoin = "round";
        ctx.beginPath(); ctx.moveTo(strikeX, -18); ctx.lineTo(strikeX - 7, strikeY - 76); ctx.lineTo(strikeX + 5, strikeY - 48); ctx.lineTo(strikeX - 3, strikeY - 24); ctx.lineTo(strikeX, strikeY); ctx.stroke();
        ctx.strokeStyle = "#6dd8ff"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(strikeX + 9, -12); ctx.lineTo(strikeX + 2, strikeY - 54); ctx.lineTo(strikeX + 8, strikeY - 24); ctx.stroke();
        ctx.restore();
        return;
      }
      var angle = Math.atan2(projectile.vy, projectile.vx), r = projectile.radius;
      ctx.save();
      ctx.translate(projectile.x, projectile.y); ctx.rotate(angle);
      if (projectile.type === "thermobaric") {
        ctx.shadowColor = "#ff4c35"; ctx.shadowBlur = 14;
        ctx.fillStyle = "#c92b28"; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.strokeStyle = "#ffbd65"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, r * .58, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "#ffe0a0"; ctx.beginPath(); ctx.arc(r * .15, -r * .18, Math.max(1.5, r * .2), 0, Math.PI * 2); ctx.fill();
      } else if (projectile.type === "airBlade") {
        var bladeReach = r * 2.05, bladeSpin = Math.sin(((S.session && S.session.elapsed) || 0) * 16 + projectile.x * .05) * .08;
        ctx.rotate(bladeSpin);
        ctx.strokeStyle = "rgba(94, 242, 160, .28)"; ctx.lineWidth = 2; ctx.lineCap = "round";
        for (var streak = -1; streak <= 1; streak++) {
          ctx.beginPath();
          ctx.moveTo(-bladeReach, streak * bladeReach * .44);
          ctx.lineTo(-bladeReach * (1.62 + Math.abs(streak) * .34), streak * bladeReach * .64);
          ctx.stroke();
        }
        ctx.shadowColor = "#4dffa0"; ctx.shadowBlur = 16;
        ctx.fillStyle = "#2fdc81";
        ctx.beginPath(); ctx.moveTo(0, -bladeReach); ctx.quadraticCurveTo(bladeReach * 1.15, 0, 0, bladeReach); ctx.quadraticCurveTo(bladeReach * .5, 0, 0, -bladeReach); ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(214, 255, 232, .85)";
        ctx.beginPath(); ctx.moveTo(0, -bladeReach * .7); ctx.quadraticCurveTo(bladeReach * .95, 0, 0, bladeReach * .7); ctx.quadraticCurveTo(bladeReach * .6, 0, 0, -bladeReach * .7); ctx.closePath(); ctx.fill();
      } else {
        ctx.shadowColor = "#65dfff"; ctx.shadowBlur = 12;
        ctx.fillStyle = projectile.type === "iceShard" ? "#b8f5ff" : "#55bdf5";
        ctx.beginPath(); ctx.moveTo(r * 2.2, 0); ctx.lineTo(-r * .9, -r * .9); ctx.lineTo(-r * .35, 0); ctx.lineTo(-r * .9, r * .9); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "rgba(239, 255, 255, .85)"; ctx.beginPath(); ctx.moveTo(r * 1.3, 0); ctx.lineTo(-r * .45, -r * .32); ctx.lineTo(-r * .1, 0); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    });
    Game.drawBombardment();
  };

  function drawZombieHead(r, info, cx, cy, scale, frost) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    var skinGradient = ctx.createLinearGradient(-r, -r, r, r);
    if (frost) { skinGradient.addColorStop(0, "#f4fbff"); skinGradient.addColorStop(.55, "#b6dbea"); skinGradient.addColorStop(1, "#6f9cb0"); }
    else { skinGradient.addColorStop(0, "#e1ad86"); skinGradient.addColorStop(.55, "#a8665e"); skinGradient.addColorStop(1, "#5a3842"); }
    ctx.fillStyle = skinGradient;
    ctx.beginPath(); ctx.arc(0, 0, r * .58, 0, Math.PI * 2); ctx.fill();
    if (!frost) {
      ctx.fillStyle = "rgba(93, 46, 50, .55)";
      ctx.beginPath(); ctx.arc(r * .25, r * .02, r * .4, -.8, 1.25); ctx.fill();
    }
    ctx.fillStyle = frost ? "#9fc4d4" : "#273336";
    ctx.beginPath(); ctx.arc(-r * .22, -r * .41, r * .3, Math.PI * 1.05, Math.PI * 1.9); ctx.arc(r * .26, -r * .38, r * .3, Math.PI * 1.1, Math.PI * 1.95); ctx.fill();
    ctx.fillStyle = info.accent;
    ctx.beginPath(); ctx.arc(-r * .22, -r * .06, Math.max(1, r * .13), 0, Math.PI * 2); ctx.arc(r * .22, -r * .06, Math.max(1, r * .13), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#211b24";
    ctx.beginPath(); ctx.arc(-r * .22, -r * .06, Math.max(.5, r * .06), 0, Math.PI * 2); ctx.arc(r * .22, -r * .06, Math.max(.5, r * .06), 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = frost ? "#6f9cb0" : "#3b2029"; ctx.lineWidth = Math.max(1, r * .08); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-r * .23, r * .21); ctx.quadraticCurveTo(0, r * .32, r * .25, r * .19); ctx.stroke();
    ctx.restore();
  }
  function drawFlameCrown(r, phase) {
    var tongues = [[-r * .72, r * .05, -r * 1.02, -r * 1.04, .76], [r * .72, r * .14, r * 1.04, -r * .96, .7], [-r * .3, r * .56, -r * .44, r * .04, .5], [r * .34, r * .62, r * .5, r * .1, .46]], i;
    ctx.save();
    ctx.shadowColor = "rgba(255, 155, 82, .8)";
    ctx.shadowBlur = Math.max(6, r * .7);
    for (i = 0; i < tongues.length; i++) {
      var rootX = tongues[i][0], rootY = tongues[i][1], size = tongues[i][4];
      var tipX = tongues[i][2] + Math.sin(phase + i * 2.1) * r * .16, tipY = tongues[i][3] + Math.cos(phase * .8 + i) * r * .05;
      var half = r * .24 * size;
      ctx.fillStyle = i < 2 ? "#ff9b52" : "#ff8a44";
      ctx.beginPath();
      ctx.moveTo(rootX - half, rootY);
      ctx.quadraticCurveTo(rootX - half * 1.2, rootY - r * .5 * size, tipX, tipY);
      ctx.quadraticCurveTo(rootX + half * 1.2, rootY - r * .5 * size, rootX + half, rootY);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.moveTo(rootX - half * .45, rootY - r * .06);
      ctx.quadraticCurveTo(rootX - half * .55, rootY - r * .42 * size, tipX + (rootX - tipX) * .3, tipY + r * .26);
      ctx.quadraticCurveTo(rootX + half * .55, rootY - r * .42 * size, rootX + half * .45, rootY - r * .06);
      ctx.closePath(); ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#ffb347"; ctx.lineWidth = Math.max(1, r * .09); ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-r * .38, r * .22); ctx.lineTo(-r * .06, r * .42);
    ctx.moveTo(r * .12, r * .16); ctx.lineTo(r * .42, r * .38);
    ctx.moveTo(-r * .24, r * .68); ctx.lineTo(r * .16, r * .84);
    ctx.stroke();
    ctx.restore();
  }
  function drawSnowmanMarks(r, phase) {
    ctx.save();
    ctx.fillStyle = "rgba(242, 251, 255, .96)";
    ctx.strokeStyle = "rgba(126, 176, 196, .85)";
    ctx.lineWidth = Math.max(1, r * .06);
    ctx.beginPath();
    ctx.moveTo(-r * .52, -r * 1.0);
    ctx.quadraticCurveTo(0, -r * 1.72, r * .52, -r * 1.0);
    ctx.quadraticCurveTo(r * .2, -r * 1.18, 0, -r * 1.14);
    ctx.quadraticCurveTo(-r * .2, -r * 1.18, -r * .52, -r * 1.0);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(-r * .62, -r * .26, r * .22, 0, Math.PI * 2); ctx.arc(r * .62, -r * .2, r * .2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#ff9b52";
    ctx.beginPath(); ctx.moveTo(-r * .06, -r * .74); ctx.lineTo(r * .32, -r * .62); ctx.lineTo(-r * .06, -r * .55); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, .55)";
    for (var i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(Math.sin(phase * .6 + i * 1.7) * r * .42, r * .18 + i * r * .19, Math.max(.8, r * .07), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  function drawThunderMarks(r, phase) {
    var arcs = [[-r * .92, r * .74, -r * 1.04, -r * .88, -1], [r * .92, r * .8, r * 1.06, -r * .82, 1]], i;
    ctx.save();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.shadowColor = "rgba(201, 161, 255, .92)";
    ctx.shadowBlur = Math.max(6, r * .78);
    for (i = 0; i < arcs.length; i++) {
      var rootX = arcs[i][0], rootY = arcs[i][1], tipY = arcs[i][3], dir = arcs[i][4];
      var wobble = Math.sin(phase + i * 1.9) * r * .18;
      ctx.strokeStyle = "rgba(168, 126, 255, .82)";
      ctx.lineWidth = Math.max(1.6, r * .14);
      ctx.beginPath();
      ctx.moveTo(rootX, rootY);
      ctx.lineTo(rootX + dir * r * .26 + wobble, rootY - r * .44);
      ctx.lineTo(rootX + dir * r * .04 - wobble, rootY - r * .82);
      ctx.lineTo(rootX + dir * r * .28 + wobble * .5, tipY);
      ctx.stroke();
      ctx.strokeStyle = "rgba(242, 236, 255, .96)";
      ctx.lineWidth = Math.max(.8, r * .05);
      ctx.stroke();
    }
    ctx.fillStyle = "#efe6ff";
    for (i = 0; i < 3; i++) {
      var spark = phase * .8 + i * 2.1;
      ctx.beginPath();
      ctx.arc(Math.sin(spark) * r * .76, -r * .22 + Math.cos(spark * .7) * r * .56, Math.max(.9, r * .08), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  function drawBirdBody(r, info, elite, phase) {
    var flap = Math.sin(phase), wingLift = flap * r * .34, wingTilt = flap * .14, side;
    ctx.fillStyle = "rgba(0, 0, 0, .3)";
    ctx.beginPath(); ctx.ellipse(0, r * 1.34, r * .58, r * .19, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = elite ? "#161c22" : "#101519";
    ctx.beginPath(); ctx.moveTo(-r * .3, r * .4); ctx.lineTo(r * .3, r * .4); ctx.lineTo(r * .17, r * 1.14); ctx.lineTo(-r * .17, r * 1.14); ctx.closePath(); ctx.fill();
    for (side = 1; side >= -1; side -= 2) {
      ctx.save();
      ctx.translate(0, -r * .16);
      ctx.scale(side, 1);
      ctx.rotate(-wingTilt);
      ctx.fillStyle = elite ? "#1a2129" : "#0b1014";
      ctx.beginPath();
      ctx.moveTo(r * .32, -r * .2);
      ctx.lineTo(r * 1.42, -r * .32 + wingLift);
      ctx.lineTo(r * 1.34, r * .26 + wingLift);
      ctx.lineTo(r * .66, r * .36);
      ctx.lineTo(r * .28, r * .16);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = elite ? "rgba(255, 209, 102, .34)" : "rgba(150, 186, 204, .32)";
      ctx.lineWidth = Math.max(1, r * .07);
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * .5, r * .2); ctx.lineTo(r * 1.24, r * .1 + wingLift); ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = elite ? "#1b232a" : "#111820";
    ctx.beginPath(); ctx.ellipse(0, r * .08, r * .42, r * .68, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = elite ? "rgba(255, 209, 102, .42)" : "rgba(150, 186, 204, .28)";
    ctx.lineWidth = Math.max(1, r * .07);
    ctx.stroke();
    ctx.fillStyle = "rgba(198, 224, 238, .09)";
    ctx.beginPath(); ctx.ellipse(-r * .1, -r * .06, r * .2, r * .32, .2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = elite ? "#1d242c" : "#141a1f";
    ctx.beginPath(); ctx.arc(0, -r * .76, r * .42, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = elite ? "rgba(255, 209, 102, .42)" : "rgba(150, 186, 204, .28)";
    ctx.beginPath(); ctx.arc(0, -r * .76, r * .42, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = elite ? C.colors.yellow : "#8b98a2";
    ctx.beginPath(); ctx.moveTo(-r * .15, -r * 1.02); ctx.lineTo(r * .15, -r * 1.02); ctx.lineTo(0, -r * 1.46); ctx.closePath(); ctx.fill();
    ctx.fillStyle = info.accent;
    ctx.beginPath(); ctx.arc(-r * .16, -r * .82, Math.max(1, r * .1), 0, Math.PI * 2); ctx.arc(r * .16, -r * .82, Math.max(1, r * .1), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#07090c";
    ctx.beginPath(); ctx.arc(-r * .16, -r * .82, Math.max(.5, r * .045), 0, Math.PI * 2); ctx.arc(r * .16, -r * .82, Math.max(.5, r * .045), 0, Math.PI * 2); ctx.fill();
  }
  function drawWaspBody(r, info, elite, phase) {
    var flap = .32 + Math.abs(Math.sin(phase)) * .72, tilt = Math.sin(phase) * .12, side, band, leg, bandWidth;
    ctx.fillStyle = "rgba(0, 0, 0, .3)";
    ctx.beginPath(); ctx.ellipse(0, r * 1.34, r * .5, r * .16, 0, 0, Math.PI * 2); ctx.fill();
    for (side = 1; side >= -1; side -= 2) {
      ctx.save();
      ctx.translate(side * r * .2, -r * .34);
      ctx.scale(side, 1);
      ctx.rotate(tilt);
      ctx.fillStyle = "rgba(206, 240, 255, .3)";
      ctx.strokeStyle = elite ? "rgba(255, 209, 102, .4)" : "rgba(198, 236, 255, .46)";
      ctx.lineWidth = Math.max(1, r * .06);
      ctx.beginPath(); ctx.ellipse(r * .58, -r * .26, r * .68, Math.max(r * .07, r * .3 * flap), -.34, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(r * .46, r * .22, r * .52, Math.max(r * .06, r * .2 * flap), .4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.strokeStyle = elite ? "#0d1016" : "#151a1f"; ctx.lineWidth = Math.max(1, r * .09); ctx.lineCap = "round";
    for (leg = -1; leg <= 1; leg++) {
      ctx.beginPath(); ctx.moveTo(-r * .1, r * (.1 + leg * .22)); ctx.lineTo(-r * .5, r * (.3 + leg * .34)); ctx.lineTo(-r * .34, r * (.62 + leg * .3)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * .1, r * (.1 + leg * .22)); ctx.lineTo(r * .5, r * (.3 + leg * .34)); ctx.lineTo(r * .34, r * (.62 + leg * .3)); ctx.stroke();
    }
    ctx.fillStyle = elite ? "#1c2230" : "#232a31";
    ctx.beginPath(); ctx.ellipse(0, r * .54, r * .42, r * .6, 0, 0, Math.PI * 2); ctx.fill();
    for (band = 0; band < 3; band++) {
      bandWidth = r * .38 * (1 - band * .2);
      U.roundedRect(ctx, -bandWidth, r * (.24 + band * .3), bandWidth * 2, r * .13, r * .06, "#e8c33a");
    }
    ctx.fillStyle = info.accent;
    ctx.beginPath(); ctx.moveTo(-r * .12, r * 1.02); ctx.lineTo(r * .12, r * 1.02); ctx.lineTo(0, r * 1.42); ctx.closePath(); ctx.fill();
    ctx.fillStyle = elite ? "#1c2230" : "#232a31";
    ctx.beginPath(); ctx.ellipse(0, -r * .34, r * .36, r * .4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = elite ? "rgba(255, 209, 102, .6)" : "rgba(232, 195, 58, .5)";
    ctx.lineWidth = Math.max(1, r * .08);
    ctx.beginPath(); ctx.ellipse(0, -r * .34, r * .36, r * .4, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = elite ? "#1c2230" : "#232a31";
    ctx.beginPath(); ctx.arc(0, -r * .82, r * .34, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = elite ? "rgba(255, 209, 102, .5)" : "rgba(168, 224, 95, .44)";
    ctx.beginPath(); ctx.arc(0, -r * .82, r * .34, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = elite ? "#0d1016" : "#151a1f"; ctx.lineWidth = Math.max(1, r * .07);
    ctx.beginPath();
    ctx.moveTo(-r * .14, -r * 1.04); ctx.lineTo(-r * .46, -r * 1.4);
    ctx.moveTo(r * .14, -r * 1.04); ctx.lineTo(r * .46, -r * 1.4);
    ctx.stroke();
    ctx.fillStyle = info.accent;
    ctx.beginPath(); ctx.arc(-r * .46, -r * 1.42, Math.max(.8, r * .09), 0, Math.PI * 2); ctx.arc(r * .46, -r * 1.42, Math.max(.8, r * .09), 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-r * .17, -r * .88, Math.max(1, r * .11), 0, Math.PI * 2); ctx.arc(r * .17, -r * .88, Math.max(1, r * .11), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#07090c";
    ctx.beginPath(); ctx.arc(-r * .17, -r * .88, Math.max(.5, r * .05), 0, Math.PI * 2); ctx.arc(r * .17, -r * .88, Math.max(.5, r * .05), 0, Math.PI * 2); ctx.fill();
  }
  function drawWheelchair(r, info, elite, phase) {
    var frame = elite ? "#4c5868" : "#5b6a7a", rim = elite ? "#93a8bf" : "#adc0d3", tire = elite ? "#1b232c" : "#222b35", drip = elite ? "#63d99a" : "#7ef0a8", side, wheelX, spoke, angle;
    U.roundedRect(ctx, -r * .5, -r * .82, r, r * 1.06, r * .14, frame, rim);
    U.roundedRect(ctx, -r * .6, r * .14, r * 1.2, r * .26, r * .1, elite ? "#2c3542" : "#38424f", rim);
    for (side = -1; side <= 1; side += 2) {
      wheelX = side * r * .94;
      ctx.fillStyle = tire;
      ctx.beginPath(); ctx.arc(wheelX, r * .3, r * .6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = elite ? "#54637a" : "#63748c";
      ctx.beginPath(); ctx.arc(wheelX, r * .3, r * .5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = rim; ctx.lineWidth = Math.max(1, r * .055);
      ctx.beginPath(); ctx.arc(wheelX, r * .3, r * .55, 0, Math.PI * 2); ctx.stroke();
      for (spoke = 0; spoke < 6; spoke++) {
        angle = phase * .3 + spoke * Math.PI / 3;
        ctx.beginPath();
        ctx.moveTo(wheelX, r * .3);
        ctx.lineTo(wheelX + Math.cos(angle) * r * .5, r * .3 + Math.sin(angle) * r * .5);
        ctx.stroke();
      }
    }
    ctx.strokeStyle = rim; ctx.lineWidth = Math.max(1, r * .1); ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-r * .34, r * .58); ctx.lineTo(-r * .2, r * .96);
    ctx.moveTo(r * .34, r * .58); ctx.lineTo(r * .2, r * .96);
    ctx.stroke();
    ctx.lineWidth = Math.max(1, r * .08);
    ctx.beginPath(); ctx.moveTo(-r * .36, r * 1); ctx.lineTo(r * .36, r * 1); ctx.stroke();
    ctx.lineWidth = Math.max(1, r * .07);
    ctx.beginPath(); ctx.moveTo(r * 1.26, r * .2); ctx.lineTo(r * 1.26, -r * 1.02); ctx.lineTo(r * .92, -r * 1.02); ctx.stroke();
    ctx.save();
    ctx.shadowColor = "rgba(120, 240, 170, " + (.55 + .35 * Math.sin(phase * 4)).toFixed(2) + ")";
    ctx.shadowBlur = Math.max(4, r * .46);
    U.roundedRect(ctx, r * .72, -r, r * .34, r * .5, r * .1, drip, "rgba(236, 255, 240, .85)");
    ctx.restore();
  }
  function drawFrostBeast(r, info, elite, phase) {
    var shell = elite ? "#5f8ba1" : "#87b6c9", rim = elite ? "#dff4ff" : "#eafaff", plate = elite ? "rgba(26, 56, 74, .55)" : "rgba(38, 74, 96, .48)";
    var limb = elite ? "#4a7186" : "#6b9cb1", shard = elite ? "#bdeaff" : "#dcf6ff", tips = elite ? [-1.1, -.74, -.38, .38, .74, 1.1] : [-1.02, -.68, .68, 1.02];
    var side, ring, line, tipX, baseY, tipH, angle, wave = Math.sin(phase) * .06;
    ctx.fillStyle = "rgba(0, 0, 0, .32)";
    ctx.beginPath(); ctx.ellipse(0, r, r * 1.28, r * .28, 0, 0, Math.PI * 2); ctx.fill();
    for (side = -1; side <= 1; side += 2) {
      U.roundedRect(ctx, side * r * 1.24 - r * .2, r * .12, r * .4, r * .42, r * .15, limb, rim);
      U.roundedRect(ctx, side * r * 1.16 - r * .2, r * .54, r * .4, r * .44, r * .15, limb, rim);
    }
    ctx.fillStyle = limb;
    ctx.beginPath(); ctx.moveTo(-r * .18, r * .68); ctx.lineTo(r * .18, r * .68); ctx.lineTo(0, r * 1.02); ctx.closePath(); ctx.fill();
    U.roundedRect(ctx, -r * .26, -r * .64, r * .52, r * .64, r * .2, elite ? "#54809a" : "#79a9be", rim);
    ctx.fillStyle = elite ? "#5b8aa2" : "#8dbcce";
    ctx.beginPath(); ctx.ellipse(0, -r * .86, r * .44, r * .38, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = rim; ctx.lineWidth = Math.max(1, r * .06); ctx.stroke();
    ctx.fillStyle = info.accent;
    ctx.beginPath(); ctx.arc(-r * .18, -r * .94, Math.max(1, r * .1), 0, Math.PI * 2); ctx.arc(r * .18, -r * .94, Math.max(1, r * .1), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#0d1a22";
    ctx.beginPath(); ctx.arc(-r * .18, -r * .94, Math.max(.5, r * .045), 0, Math.PI * 2); ctx.arc(r * .18, -r * .94, Math.max(.5, r * .045), 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.shadowColor = "rgba(150, 230, 255, .45)"; ctx.shadowBlur = Math.max(4, r * .5);
    ctx.fillStyle = shell;
    ctx.beginPath(); ctx.ellipse(0, r * .1, r * 1.4, r * .82, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = rim; ctx.lineWidth = Math.max(1.2, r * .08);
    ctx.beginPath(); ctx.ellipse(0, r * .1, r * 1.4, r * .82, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = plate; ctx.lineWidth = Math.max(1, r * .05);
    for (ring = 0; ring < 2; ring++) {
      ctx.beginPath(); ctx.ellipse(0, r * .1, r * (.96 - ring * .34), r * (.55 - ring * .21), 0, 0, Math.PI * 2); ctx.stroke();
    }
    for (line = 0; line < 8; line++) {
      angle = Math.PI * line / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * r * .58, r * .1 + Math.sin(angle) * r * .34);
      ctx.lineTo(Math.cos(angle) * r * 1.32, r * .1 + Math.sin(angle) * r * .77);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(244, 254, 255, .3)";
    ctx.beginPath(); ctx.ellipse(-r * .42, -r * .24, r * .54, r * .24, -.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = shard;
    ctx.strokeStyle = "rgba(248, 254, 255, .85)"; ctx.lineWidth = Math.max(1, r * .05);
    for (line = 0; line < tips.length; line++) {
      tipX = tips[line];
      baseY = r * .1 - r * .82 * Math.sqrt(Math.max(0, 1 - (tipX / 1.4) * (tipX / 1.4)));
      tipH = r * (.3 + .22 * Math.cos(tipX * 1.2)) + wave * r;
      ctx.beginPath();
      ctx.moveTo(tipX * r - r * .16, baseY);
      ctx.lineTo(tipX * r + r * .16, baseY);
      ctx.lineTo(tipX * r, baseY - tipH);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  function statusInfo(id) { return (C.statusEffects || {})[id] || { name: "", color: C.colors.text, label: "" }; }
  function drawFreezeShell(enemy, r, info) {
    var reach = r * (info.flying ? 1.5 : enemy.type === "boss" ? 1.45 : 1.18);
    ctx.save();
    ctx.fillStyle = "rgba(140, 233, 255, .2)";
    ctx.beginPath(); ctx.arc(0, -r * .1, reach, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(206, 248, 255, .72)"; ctx.lineWidth = Math.max(1, r * .08);
    ctx.beginPath(); ctx.arc(0, -r * .1, reach, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  function statusBadgeWidth(label) { return 15 + label.length * 6; }
  function drawStatusBadge(x, y, label, color) {
    var width = statusBadgeWidth(label);
    U.roundedRect(ctx, x, y, width, 12, 4, "rgba(12, 30, 40, .88)", color);
    text(label, x + width / 2, y + 9, "bold 8px Segoe UI, Microsoft YaHei", color, "center");
  }
  function drawDamageBadges(enemy, reach) {
    var marks = [], burn = statusInfo("burn"), frostbite = statusInfo("frostbite"), stacks = Game.getFrostbiteStacks(enemy);
    if (enemy.burn > 0) marks.push({ label: burn.label, color: burn.color });
    if (stacks > 0) marks.push({ label: frostbite.label + stacks, color: frostbite.color });
    if (!marks.length) return;
    var rowWidth = 0, y = enemy.y - reach - 18;
    marks.forEach(function (mark) { mark.width = statusBadgeWidth(mark.label); rowWidth += mark.width + 3; });
    var x = U.clamp(enemy.x + reach + 3, 2, C.width - 2 - rowWidth + 3);
    marks.forEach(function (mark) { drawStatusBadge(x, y, mark.label, mark.color); x += mark.width + 3; });
  }
  function drawEnemyVitals(enemy, r) {
    var info = C.enemies[enemy.type], reach = info && info.flying ? r * 1.6 : r;
    if (Game.isHardControlled(enemy)) {
      var control = statusInfo(enemy.controlType);
      text(control.label || "控", enemy.x, enemy.y - reach - 17, "bold 10px Segoe UI, Microsoft YaHei", control.color, "center");
    }
    if (enemy.armorCharges > 0) {
      var armorLabel = "甲 " + enemy.armorCharges, armorBadgeWidth = armorLabel.length > 3 ? 30 : 22;
      U.roundedRect(ctx, enemy.x - reach - armorBadgeWidth - 3, enemy.y - reach - 18, armorBadgeWidth, 12, 4, "rgba(12, 30, 40, .88)", enemy.armorFlash > 0 ? C.colors.cyan : "rgba(104, 216, 255, .5)");
      text(armorLabel, enemy.x - reach - armorBadgeWidth / 2 - 3, enemy.y - reach - 9, "bold 8px Segoe UI, Microsoft YaHei", C.colors.cyan, "center");
    }
    drawDamageBadges(enemy, reach);
    if (enemy.type === "boss") { if (!enemy.hideHealthBar) Game.drawBossHealthBar(enemy, r); }
    else if (!enemy.hideHealthBar) { ctx.fillStyle = "rgba(0, 0, 0, .5)"; ctx.fillRect(enemy.x - r, enemy.y - reach - 13, r * 2, 3); ctx.fillStyle = C.colors.green; ctx.fillRect(enemy.x - r, enemy.y - reach - 13, r * 2 * U.clamp(enemy.hp / enemy.maxHp, 0, 1), 3); }
  }
  Game.drawEnemies = function (singleEnemy, layer) {
    (singleEnemy ? [singleEnemy] : S.enemies).forEach(function (enemy) {
      var info = C.enemies[enemy.type], r = info.radius, pulse = 1 + Math.sin(S.session.elapsed * 4) * .03;
      if (layer === "air" && !info.flying) return;
      if (layer === "ground" && info.flying) return;
      var isRunner = enemy.type === "runner" || enemy.type === "runnerElite", isElite = info.codexCategory === "elite";
      var isSplitter = enemy.type === "splitter" || enemy.type === "splitterElite" || enemy.type === "splitterChild" || enemy.type === "splitterEliteChild";
      var isTwoHead = enemy.type === "splitter" || enemy.type === "splitterElite";
      var isArmored = enemy.type === "armored" || enemy.type === "armoredElite", isBasketball = enemy.type === "basketball" || enemy.type === "basketballElite";
      var isBird = enemy.type === "bird" || enemy.type === "birdElite";
      var isFlame = enemy.type === "flame" || enemy.type === "flameElite";
      var isSnowman = enemy.type === "snowman" || enemy.type === "snowmanElite";
      var isThunder = enemy.type === "thunder" || enemy.type === "thunderElite";
      var isWasp = enemy.type === "wasp" || enemy.type === "waspElite";
      var isWheelchair = enemy.type === "wheelchair" || enemy.type === "wheelchairElite";
      var isFrostBeast = enemy.type === "frostBeast" || enemy.type === "frostBeastElite";
      var auraReach = info.flying ? r * 1.7 : r;
      var shirtColor = isSplitter ? (isElite ? "#584a84" : "#463c6b")
        : isElite ? (isRunner ? "#98633b" : isArmored ? "#5b6b78" : isBasketball ? "#96591f" : isFlame ? "#4d2318" : isSnowman ? "#9fc4d4" : isThunder ? "#4c3f8f" : "#617745")
        : isRunner ? "#705345" : enemy.type === "boss" ? "#4d2d3b" : isArmored ? "#46545f" : isBasketball ? "#7a4a20" : isFlame ? "#3a1c14" : isSnowman ? "#c6e0ea" : isThunder ? "#6b5bb5" : "#3f6655";
      var shirtShadow = isSplitter ? "#241f38"
        : isElite ? (isArmored ? "#333f48" : isBasketball ? "#4f2d0f" : isFlame ? "#2b1109" : isSnowman ? "#6d94a4" : isThunder ? "#2b2258" : "#3b3026")
        : isRunner ? "#382b2d" : enemy.type === "boss" ? "#281c2a" : isArmored ? "#28323a" : isBasketball ? "#4a2a12" : isFlame ? "#22100b" : isSnowman ? "#7fa6b6" : isThunder ? "#3a2f6b" : "#243c39";
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.scale(pulse, pulse);
      if (isElite) {
        ctx.shadowColor = "rgba(255, 209, 102, .72)"; ctx.shadowBlur = 13;
        ctx.strokeStyle = "#ffd166"; ctx.lineWidth = Math.max(1.5, r * .09);
        ctx.beginPath(); ctx.arc(0, 0, auraReach + 4, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
      }
      var controlled = Game.isHardControlled(enemy);
      if (enemy.slow > 0 || controlled) {
        ctx.strokeStyle = controlled ? statusInfo(enemy.controlType).color : statusInfo("slow").color;
        ctx.lineWidth = controlled ? 2.5 : 1.5;
        ctx.setLineDash(controlled ? [3, 2] : [5, 4]);
        ctx.beginPath(); ctx.arc(0, 0, auraReach + 7, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
      if (enemy.type === "boss") { ctx.shadowColor = "rgba(255, 107, 107, .65)"; ctx.shadowBlur = 18; }
      if (enemy.hitFlash > 0) ctx.globalAlpha = .45;

      if (isBird) {
        drawBirdBody(r, info, isElite, S.session.elapsed * 8 + enemy.x * .07 + enemy.y * .05);
        if (Game.isHardControlled(enemy) && enemy.controlType === "freeze") drawFreezeShell(enemy, r, info);
        ctx.restore();
        drawEnemyVitals(enemy, r);
        return;
      }

      if (isWasp) {
        drawWaspBody(r, info, isElite, S.session.elapsed * 11 + enemy.x * .07 + enemy.y * .05);
        if (Game.isHardControlled(enemy) && enemy.controlType === "freeze") drawFreezeShell(enemy, r, info);
        ctx.restore();
        drawEnemyVitals(enemy, r);
        return;
      }

      if (isFrostBeast) {
        drawFrostBeast(r, info, isElite, S.session.elapsed * 1.6 + enemy.x * .05 + enemy.y * .03);
        if (Game.isHardControlled(enemy) && enemy.controlType === "freeze") drawFreezeShell(enemy, r, info);
        ctx.restore();
        drawEnemyVitals(enemy, r);
        return;
      }

      // 僵尸投影、双腿和歪斜的手臂。
      ctx.fillStyle = "rgba(0, 0, 0, .34)";
      ctx.beginPath(); ctx.ellipse(0, r * 1.05, r * 1.05, r * .34, 0, 0, Math.PI * 2); ctx.fill();
      if (isWheelchair) {
        drawWheelchair(r, info, isElite, S.session.elapsed * 1.2 + enemy.x * .05);
      } else {
        ctx.strokeStyle = shirtShadow; ctx.lineWidth = Math.max(2, r * .24); ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(-r * .25, r * .45); ctx.lineTo(-r * .4, r * .98); ctx.moveTo(r * .24, r * .45); ctx.lineTo(r * .4, r * .98); ctx.stroke();
        ctx.strokeStyle = "#202b2d"; ctx.lineWidth = Math.max(2, r * .15);
        ctx.beginPath(); ctx.moveTo(-r * .48, r * .98); ctx.lineTo(-r * .16, r * .98); ctx.moveTo(r * .16, r * .98); ctx.lineTo(r * .5, r * .98); ctx.stroke();
      }
      ctx.strokeStyle = shirtShadow; ctx.lineWidth = Math.max(2, r * .22);
      ctx.beginPath(); ctx.moveTo(-r * .55, -r * .02); ctx.lineTo(-r * 1.02, r * .48); ctx.moveTo(r * .55, -r * .02); ctx.lineTo(r * 1.02, r * .36); ctx.stroke();

      // 破损上衣和向前凸出的腹部。
      U.roundedRect(ctx, -r * .65, -r * .12, r * 1.3, r * 1.1, r * .2, shirtColor, shirtShadow);
      ctx.fillStyle = "rgba(221, 239, 202, .22)";
      ctx.beginPath(); ctx.moveTo(-r * .5, r * .2); ctx.lineTo(-r * .1, r * .08); ctx.lineTo(r * .45, r * .33); ctx.lineTo(r * .34, r * .78); ctx.lineTo(-r * .45, r * .68); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(18, 26, 29, .55)";
      ctx.beginPath(); ctx.moveTo(-r * .65, r * .58); ctx.lineTo(-r * .2, r * .76); ctx.lineTo(-r * .33, r * 1.02); ctx.lineTo(-r * .64, r * .86); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * .15, r * .66); ctx.lineTo(r * .62, r * .52); ctx.lineTo(r * .65, r * .9); ctx.lineTo(r * .34, r * 1.02); ctx.closePath(); ctx.fill();

      if (isArmored) {
        var broken = !enemy.armorCharges;
        ctx.save();
        ctx.globalAlpha = broken ? .34 : 1;
        if (!broken && enemy.armorFlash > 0) { ctx.shadowColor = "rgba(150, 230, 255, .95)"; ctx.shadowBlur = 14; }
        ctx.fillStyle = broken ? "#3f4a52" : "#6f7f8c";
        ctx.beginPath(); ctx.arc(-r * .72, -r * .18, r * .3, 0, Math.PI * 2); ctx.arc(r * .72, -r * .18, r * .3, 0, Math.PI * 2); ctx.fill();
        U.roundedRect(ctx, -r * .78, -r * .2, r * 1.56, r * .82, r * .22, "#5f6f7c", broken ? "#4b5860" : "#93a8b6");
        ctx.shadowBlur = 0;
        ctx.fillStyle = broken ? "rgba(170, 190, 204, .16)" : "rgba(214, 236, 250, .24)";
        ctx.beginPath(); ctx.moveTo(-r * .58, -r * .06); ctx.lineTo(r * .06, -r * .12); ctx.lineTo(r * .34, r * .26); ctx.lineTo(-r * .26, r * .36); ctx.closePath(); ctx.fill();
        ctx.fillStyle = broken ? "rgba(30, 38, 44, .5)" : "rgba(28, 38, 46, .62)";
        ctx.fillRect(-r * .68, r * .38, r * 1.36, Math.max(1, r * .13));
        for (var rivet = -1; rivet <= 1; rivet++) {
          ctx.beginPath(); ctx.arc(rivet * r * .44, r * .6, Math.max(.8, r * .07), 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }

      // 腐烂的头部、头发、发光眼睛和张开的嘴；分裂僵尸共用身体但有两个头。
      if (isTwoHead) {
        drawZombieHead(r, info, -r * .4, -r * .74, .74);
        drawZombieHead(r, info, r * .4, -r * .74, .74);
      } else drawZombieHead(r, info, 0, -r * .72, 1, isSnowman);

      // 特殊僵尸的识别部件。
       if (isRunner) { ctx.strokeStyle = isElite ? "#fff0a5" : "#ffe0a7"; ctx.lineWidth = Math.max(1, r * .12); ctx.beginPath(); ctx.moveTo(-r * .7, r * .55); ctx.lineTo(-r * 1.18, r * .9); ctx.moveTo(r * .7, r * .48); ctx.lineTo(r * 1.16, r * .72); ctx.stroke(); }
      if (isFlame) drawFlameCrown(r, S.session.elapsed * 6 + enemy.x * .06 + enemy.y * .04);
      if (isSnowman) drawSnowmanMarks(r, S.session.elapsed * 1.6 + enemy.x * .05);
      if (isThunder) drawThunderMarks(r, S.session.elapsed * 7 + enemy.x * .06 + enemy.y * .04);
      if (enemy.type === "boss") { ctx.fillStyle = "#6d3949"; ctx.beginPath(); ctx.moveTo(-r * .65, -r * 1.18); ctx.lineTo(-r * .82, -r * 1.7); ctx.lineTo(-r * .35, -r * 1.35); ctx.lineTo(0, -r * 1.78); ctx.lineTo(r * .3, -r * 1.3); ctx.lineTo(r * .82, -r * 1.7); ctx.lineTo(r * .65, -r * 1.1); ctx.closePath(); ctx.fill(); ctx.strokeStyle = C.colors.red; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r + 5, 0, Math.PI * 2); ctx.stroke(); }
      var regenLimit = info.regenBelowHpRatio ? enemy.maxHp * info.regenBelowHpRatio : enemy.maxHp;
      if (info.regenPerSecond > 0 && enemy.hp < regenLimit) {
        ctx.save();
        ctx.globalAlpha = .3 + .25 * Math.sin(S.session.elapsed * 5);
        ctx.strokeStyle = C.colors.green; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, r * (isWheelchair ? 1.72 : .82), 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      if (enemy.wound > 0) {
        var woundReach = r * (info.flying ? 1.85 : 1.5);
        ctx.save();
        ctx.globalAlpha = .45 + .3 * Math.sin((S.session ? S.session.elapsed : 0) * 6);
        ctx.strokeStyle = "#5ef2a0";
        ctx.lineWidth = 2.4;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.arc(0, 0, woundReach, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
        if (enemy.woundExtra > 0) {
          ctx.strokeStyle = "#e8fff2";
          ctx.setLineDash([3, 2]);
          ctx.beginPath(); ctx.arc(0, 0, woundReach * 1.22, Math.PI * 1.14, Math.PI * 1.86); ctx.stroke();
        }
        ctx.restore();
      }
      if (isBasketball) {
        var ballX = r * .95, ballY = -r * .92, ballR = r * .42;
        ctx.strokeStyle = shirtShadow; ctx.lineWidth = Math.max(2, r * .2); ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(r * .5, -r * .05); ctx.lineTo(r * .74, -r * .5); ctx.lineTo(ballX, ballY + ballR * .55); ctx.stroke();
        ctx.fillStyle = "#1d2328";
        ctx.beginPath(); ctx.arc(ballX, ballY, ballR, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#e08a2c";
        ctx.beginPath(); ctx.arc(ballX, ballY, ballR * .9, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#7d4413"; ctx.lineWidth = Math.max(1, r * .07);
        ctx.beginPath(); ctx.arc(ballX, ballY, ballR * .9, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ballX - ballR * .9, ballY); ctx.lineTo(ballX + ballR * .9, ballY); ctx.moveTo(ballX, ballY - ballR * .9); ctx.lineTo(ballX, ballY + ballR * .9); ctx.stroke();
        ctx.beginPath(); ctx.arc(ballX - ballR * 1.05, ballY, ballR * .72, -Math.PI * .42, Math.PI * .42); ctx.stroke();
        ctx.beginPath(); ctx.arc(ballX + ballR * 1.05, ballY, ballR * .72, Math.PI * .58, Math.PI * 1.42); ctx.stroke();
      }
      if (Game.isHardControlled(enemy) && enemy.controlType === "freeze") drawFreezeShell(enemy, r, info);
      ctx.restore();
      drawEnemyVitals(enemy, r);
    });
  };
  Game.drawBossHealthBar = function (enemy, r) {
    var cfg = C.bossHealth, bars = Math.max(1, cfg.bars);
    var width = Math.min(cfg.width, C.width - 24), height = cfg.barHeight;
    var x = U.clamp(enemy.x - width / 2, 8, C.width - width - 8);
    var y = enemy.y - r * cfg.headExtent - cfg.offsetY - height;
    var ratio = U.clamp(enemy.hp / enemy.maxHp, 0, 1);
    var remaining = Math.ceil(ratio * bars);
    if (remaining <= 0) return;
    var fill = ratio * bars - (remaining - 1);
    ctx.save();
    U.roundedRect(ctx, x, y, width, height, height / 2, cfg.track, "rgba(0, 0, 0, .35)");
    U.roundedRect(ctx, x, y, Math.max(height, width * fill), height, height / 2, C.colors.red);
    ctx.shadowColor = "rgba(0, 0, 0, .85)";
    ctx.shadowBlur = 4;
    text("×" + remaining, x + width - 6, y + height / 2 + 3.5, "bold 9px Segoe UI, Microsoft YaHei", C.colors.text, "right");
    ctx.restore();
  };
  Game.drawEnemyShots = function () {
    (S.enemyShots || []).forEach(function (shot) {
      var r = shot.radius, stinger = shot.type === "stinger";
      ctx.save();
      ctx.translate(shot.x, shot.y);
      ctx.fillStyle = "rgba(0, 0, 0, .3)";
      ctx.beginPath(); ctx.ellipse(2, S.wall.y - S.wall.height / 2 - shot.y + 2, r * .8, r * .26, 0, 0, Math.PI * 2); ctx.fill();
      if (stinger) {
        ctx.rotate(Math.sin(shot.travel * .12) * .14);
        ctx.fillStyle = "rgba(168, 224, 95, .2)";
        ctx.beginPath(); ctx.ellipse(0, -r * 1.24, r * .46, r * 1.4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(206, 240, 255, .34)";
        ctx.beginPath(); ctx.ellipse(-r * .6, -r * .52, r * .5, r * .2, -.34, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(r * .6, -r * .52, r * .5, r * .2, .34, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = shot.accent || "#a8e05f";
        ctx.beginPath(); ctx.moveTo(0, r * 1.9); ctx.lineTo(-r * .34, -r * .4); ctx.lineTo(r * .34, -r * .4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#151a1f";
        ctx.beginPath(); ctx.ellipse(0, -r * .92, r * .4, r * .52, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(232, 195, 58, .8)"; ctx.lineWidth = Math.max(1, r * .16);
        ctx.beginPath(); ctx.moveTo(-r * .32, -r * .66); ctx.lineTo(r * .32, -r * .66); ctx.stroke();
        ctx.restore();
        return;
      }
      ctx.rotate(shot.spin);
      ctx.fillStyle = "#1d2328";
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#e08a2c";
      ctx.beginPath(); ctx.arc(0, 0, r * .88, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#7d4413"; ctx.lineWidth = Math.max(1, r * .16);
      ctx.beginPath(); ctx.arc(0, 0, r * .88, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r * .88, 0); ctx.lineTo(r * .88, 0); ctx.moveTo(0, -r * .88); ctx.lineTo(0, r * .88); ctx.stroke();
      ctx.beginPath(); ctx.arc(-r * 1.04, 0, r * .7, -Math.PI * .42, Math.PI * .42); ctx.stroke();
      ctx.beginPath(); ctx.arc(r * 1.04, 0, r * .7, Math.PI * .58, Math.PI * 1.42); ctx.stroke();
      ctx.fillStyle = "rgba(255, 226, 168, .5)";
      ctx.beginPath(); ctx.arc(-r * .3, -r * .34, r * .22, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
  };
  Game.drawArmoredCars = function () {
    (S.armoredCars || []).forEach(function (car) {
      var w = car.width, l = car.length;
      ctx.save();
      ctx.translate(car.x, car.y);
      ctx.fillStyle = "rgba(0, 0, 0, .42)";
      ctx.beginPath(); ctx.ellipse(2, l * .12, w * .66, l * .43, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#18252a";
      U.roundedRect(ctx, -w * .52, -l * .47, w * .22, l * .9, 4, "#18252a", "#78908c");
      U.roundedRect(ctx, w * .3, -l * .47, w * .22, l * .9, 4, "#18252a", "#78908c");
      for (var wheelY = -l * .34; wheelY < l * .42; wheelY += l * .23) {
        ctx.fillStyle = "#b1c0b1"; ctx.fillRect(-w * .5, wheelY, w * .17, 3); ctx.fillRect(w * .33, wheelY, w * .17, 3);
      }
      var bodyGradient = ctx.createLinearGradient(-w / 2, -l / 2, w / 2, l / 2);
      bodyGradient.addColorStop(0, car.impactFlash > 0 ? "#fff0aa" : "#b1c8a2");
      bodyGradient.addColorStop(.45, car.impactFlash > 0 ? "#e5bd69" : "#617d6d");
      bodyGradient.addColorStop(1, "#293e3b");
      ctx.shadowColor = "rgba(0, 0, 0, .55)"; ctx.shadowBlur = 8;
      U.roundedRect(ctx, -w * .4, -l / 2, w * .8, l, Math.max(4, w * .14), bodyGradient, "#d1e1c3");
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(17, 35, 40, .86)";
      ctx.beginPath(); ctx.moveTo(-w * .29, -l * .24); ctx.lineTo(w * .29, -l * .24); ctx.lineTo(w * .23, -l * .03); ctx.lineTo(-w * .23, -l * .03); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(220, 242, 207, .65)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-w * .27, -l * .22); ctx.lineTo(0, -l * .13); ctx.lineTo(w * .27, -l * .22); ctx.stroke();
      ctx.fillStyle = "#52665c"; U.roundedRect(ctx, -w * .22, l * .02, w * .44, l * .34, 4, "#52665c", "#c1d2b7");
      ctx.fillStyle = "#d9e8be"; ctx.fillRect(-w * .1, -l * .44, w * .2, 3);
      ctx.fillStyle = "#ffcf72"; ctx.fillRect(-w * .27, -l * .45, w * .12, 3); ctx.fillRect(w * .15, -l * .45, w * .12, 3);
      ctx.restore();
    });
  };

  Game.drawWhirlwinds = function () {
    var time = S.session ? S.session.elapsed : 0;
    (S.tornadoes || []).forEach(function (tornado) {
      var appear = U.clamp((tornado.duration - tornado.life) / .3, 0, 1), vanish = U.clamp(tornado.life / .35, 0, 1);
      var alpha = Math.min(appear, vanish), tint = tornado.stationary ? "#ffeec4" : "#d8f4ff";
      var height = tornado.radius * 2.8, base = tornado.y + height * .42;
      ctx.save();
      ctx.globalAlpha = alpha * .38;
      ctx.fillStyle = "rgba(3, 12, 18, .92)";
      ctx.beginPath(); ctx.ellipse(tornado.x, base + 3, tornado.radius * .34, tornado.radius * .11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = alpha * .42;
      ctx.strokeStyle = tornado.stationary ? "#ffd479" : "#8fe4ff";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 6]);
      ctx.beginPath(); ctx.arc(tornado.x, tornado.y, tornado.radius, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      for (var layer = 0; layer < 10; layer++) {
        var t = layer / 9, layerRadius = tornado.radius * (.3 + .78 * t * (.65 + .35 * t)), layerY = base - height * t;
        var sway = Math.sin(time * 3.6 + t * 5.1) * tornado.radius * .18 * (.25 + t);
        ctx.globalAlpha = alpha * (.09 + .2 * t);
        ctx.fillStyle = tint;
        ctx.beginPath(); ctx.ellipse(tornado.x + sway, layerY, layerRadius, layerRadius * .3, 0, 0, Math.PI * 2); ctx.fill();
      }
      for (var ring = 0; ring < 3; ring++) {
        var phase = time * 2.6 + ring * 2.1, ringY = base - height * (.18 + ring * .26), ringRadius = tornado.radius * (.42 + ring * .19);
        ctx.globalAlpha = alpha * .48;
        ctx.strokeStyle = ring % 2 ? "#a9e9ff" : "#ffffff";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(tornado.x + Math.sin(phase) * tornado.radius * .22, ringY, ringRadius, ringRadius * .3, 0, phase, phase + Math.PI * 1.25);
        ctx.stroke();
      }
      for (var debris = 0; debris < 6; debris++) {
        var debrisPhase = time * 4.2 + debris * 1.05, debrisT = (debris % 3) / 3 + .12, debrisRadius = tornado.radius * (.42 + debrisT * .5);
        ctx.globalAlpha = alpha * .6;
        ctx.fillStyle = debris % 2 ? "rgba(190, 232, 244, .92)" : "rgba(255, 255, 255, .78)";
        ctx.beginPath();
        ctx.arc(tornado.x + Math.cos(debrisPhase) * debrisRadius, base - height * debrisT + Math.sin(debrisPhase) * tornado.radius * .14, 1.5 + debris % 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  };

  Game.drawDrones = function () {
    var time = S.session ? S.session.elapsed : 0;
    (S.drones || []).forEach(function (drone) {
      var r = drone.radius, appear = U.clamp((drone.duration - drone.life) / .25, 0, 1), vanish = U.clamp(drone.life / .3, 0, 1);
      var alpha = Math.min(appear, vanish), tilt = Math.sin(time * 2.4) * .12, spin = drone.spin || time * 9;
      ctx.save();
      ctx.globalAlpha = alpha * .34;
      ctx.fillStyle = "rgba(3, 12, 18, .9)";
      ctx.beginPath(); ctx.ellipse(drone.x, drone.y + r * .72, r * .58, r * .2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = alpha * .38;
      ctx.strokeStyle = "#a6c8ff";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 6]);
      ctx.beginPath(); ctx.arc(drone.x, drone.y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      for (var arm = 0; arm < 4; arm++) {
        var armAngle = spin * .18 + arm * Math.PI / 2, armX = drone.x + Math.cos(armAngle) * r * .98, armY = drone.y + Math.sin(armAngle) * r * .98 * .66;
        ctx.globalAlpha = alpha * .9;
        ctx.strokeStyle = "#6f86a8";
        ctx.lineWidth = Math.max(1.5, r * .12);
        ctx.beginPath(); ctx.moveTo(drone.x, drone.y); ctx.lineTo(armX, armY); ctx.stroke();
        ctx.globalAlpha = alpha * .34;
        ctx.fillStyle = "#cfe4ff";
        var rotor = r * (.36 + .1 * Math.sin(time * 26 + arm * 1.7));
        ctx.beginPath(); ctx.ellipse(armX, armY, rotor, rotor * .26, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = alpha * 1;
        ctx.fillStyle = "#31435c";
        ctx.beginPath(); ctx.arc(armX, armY, Math.max(1.6, r * .13), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#9fb6d8";
        ctx.beginPath(); ctx.arc(armX, armY, Math.max(.8, r * .07), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = alpha;
      ctx.save();
      ctx.translate(drone.x, drone.y);
      ctx.rotate(tilt);
      var bodyGradient = ctx.createLinearGradient(-r * .8, -r * .6, r * .8, r * .6);
      bodyGradient.addColorStop(0, "#dbe7f8");
      bodyGradient.addColorStop(.45, "#7d93b0");
      bodyGradient.addColorStop(1, "#37485f");
      ctx.shadowColor = "rgba(0, 0, 0, .5)"; ctx.shadowBlur = 8;
      ctx.fillStyle = bodyGradient;
      ctx.beginPath(); ctx.ellipse(0, 0, r * .74, r * .58, 0, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#dceaff"; ctx.lineWidth = Math.max(1, r * .07);
      ctx.beginPath(); ctx.ellipse(0, 0, r * .74, r * .58, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "rgba(24, 38, 54, .9)";
      ctx.beginPath(); ctx.ellipse(0, -r * .04, r * .42, r * .32, 0, 0, Math.PI * 2); ctx.fill();
      ctx.shadowColor = "#7fe4ff"; ctx.shadowBlur = 10;
      var pulse = .55 + .45 * Math.sin(time * 5.5);
      ctx.fillStyle = "rgba(" + Math.round(90 + 70 * pulse) + ", 232, 255, " + (.6 + .4 * pulse).toFixed(2) + ")";
      ctx.beginPath(); ctx.arc(0, -r * .04, Math.max(1.6, r * .2), 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255, 255, 255, .82)";
      ctx.beginPath(); ctx.arc(-r * .07, -r * .1, Math.max(.7, r * .07), 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(214, 240, 255, .5)"; ctx.lineWidth = Math.max(1, r * .06);
      ctx.beginPath(); ctx.moveTo(-r * .5, r * .38); ctx.lineTo(r * .5, r * .38); ctx.stroke();
      ctx.fillStyle = "#31435c";
      ctx.fillRect(-r * .62, r * .44, r * .2, Math.max(1.4, r * .12));
      ctx.fillRect(r * .42, r * .44, r * .2, Math.max(1.4, r * .12));
      ctx.fillStyle = Math.sin(time * 9) > 0 ? "#7dffb0" : "#3f6a52";
      ctx.beginPath(); ctx.arc(r * .38, -r * .34, Math.max(1, r * .08), 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.globalAlpha = alpha * .7;
      ctx.strokeStyle = "rgba(166, 200, 255, .75)";
      ctx.lineWidth = Math.max(1, r * .09);
      ctx.beginPath();
      ctx.moveTo(drone.x - r * .1, drone.y - r * .58); ctx.lineTo(drone.x - r * .1, drone.y - r * 1.05);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(drone.x - r * .1, drone.y - r * 1.12, Math.max(1.2, r * .1), 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 209, 102, " + (.4 + .6 * (.5 + .5 * Math.sin(time * 6))).toFixed(2) + ")";
      ctx.fill();
      ctx.restore();
    });
  };

  Game.drawHailStorms = function () {
    var time = S.session ? S.session.elapsed : 0;
    (S.hailStorms || []).forEach(function (storm) {
      var appear = U.clamp((storm.duration - storm.life) / .18, 0, 1), vanish = U.clamp(storm.life / .3, 0, 1);
      var alpha = Math.min(appear, vanish), pulse = .96 + Math.sin(time * 6) * .04;
      ctx.save();
      ctx.globalAlpha = alpha * .24;
      ctx.fillStyle = "#7fd8ff";
      ctx.beginPath(); ctx.arc(storm.x, storm.y, storm.radius * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = alpha * .5;
      ctx.fillStyle = "rgba(226, 250, 255, .5)";
      ctx.beginPath(); ctx.arc(storm.x, storm.y, storm.radius * .52 * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = alpha * .55;
      ctx.strokeStyle = "#cdf3ff";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.arc(storm.x, storm.y, storm.radius * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = alpha * .9;
      for (var shard = 0; shard < 16; shard++) {
        var angle = shard * 2.399, distance = storm.radius * (.16 + .8 * ((shard * .37) % 1));
        var fall = (time * 230 + shard * 43) % (storm.radius * 2.2);
        var shardX = storm.x + Math.cos(angle) * distance, shardY = storm.y - storm.radius * 1.1 + fall;
        ctx.strokeStyle = shard % 3 ? "#e6faff" : "#9fe4ff";
        ctx.lineWidth = shard % 2 ? 1.5 : 2.3;
        ctx.beginPath(); ctx.moveTo(shardX, shardY); ctx.lineTo(shardX - 2.4, shardY + 9); ctx.stroke();
      }
      ctx.restore();
    });
  };

  Game.drawFuelPools = function () {
    var time = S.session ? S.session.elapsed : 0;
    (S.fuelPools || []).forEach(function (pool) {
      var appear = U.clamp((pool.duration - pool.life) / .15, 0, 1), vanish = U.clamp(pool.life / .25, 0, 1);
      var alpha = Math.min(appear, vanish), pulse = .97 + Math.sin(time * 9) * .03;
      ctx.save();
      ctx.globalAlpha = alpha * .28;
      ctx.fillStyle = "#ff6a2a";
      ctx.beginPath(); ctx.arc(pool.x, pool.y, pool.radius * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = alpha * .34;
      ctx.fillStyle = "rgba(255, 214, 130, .6)";
      ctx.beginPath(); ctx.arc(pool.x, pool.y, pool.radius * .46 * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = alpha * .5;
      ctx.strokeStyle = "#ffbe6b";
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 5]);
      ctx.beginPath(); ctx.arc(pool.x, pool.y, pool.radius * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = alpha * .88;
      for (var flame = 0; flame < 14; flame++) {
        var angle = flame * 2.399, distance = pool.radius * (.12 + .78 * ((flame * .41) % 1));
        var flameX = pool.x + Math.cos(angle) * distance, base = pool.y + Math.sin(angle) * distance * .42;
        var height = 7 + Math.sin(time * 11 + flame * 1.7) * 4 + (flame % 3) * 2;
        ctx.fillStyle = flame % 3 === 0 ? "rgba(255, 226, 150, .95)" : flame % 2 ? "rgba(255, 150, 60, .92)" : "rgba(255, 96, 40, .9)";
        ctx.beginPath();
        ctx.moveTo(flameX - 2.6, base);
        ctx.quadraticCurveTo(flameX - 1.2, base - height * .6, flameX, base - height);
        ctx.quadraticCurveTo(flameX + 1.2, base - height * .6, flameX + 2.6, base);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    });
  };

  Game.drawFuelShells = function () {
    (S.fuelShells || []).forEach(function (shell) {
      var progress = U.clamp(shell.elapsed / shell.flightTime, 0, 1);
      var lift = Math.sin(Math.PI * progress) * (shell.arcHeight || 0);
      var x = shell.x, y = shell.y - lift, angle = Math.atan2(shell.targetY - shell.originY, shell.targetX - shell.originX);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);
      ctx.globalAlpha = .45 + progress * .3;
      ctx.fillStyle = "#ff9b52";
      ctx.beginPath(); ctx.arc(0, 8, 3 + progress * 2, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#3a2b24";
      ctx.beginPath(); ctx.arc(0, 0, 5.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ff7043";
      ctx.fillRect(-5.4, -1.7, 10.8, 3.4);
      ctx.fillStyle = "#ffd9a0";
      ctx.beginPath(); ctx.arc(0, -3.7, 1.7, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
  };

  function drawCodexEnemyModel(id, enemy, x, y, width, height, detail) {
    var isBoss = id === "boss", flying = !!enemy.flying, wheelchair = id === "wheelchair" || id === "wheelchairElite", topExtent = isBoss ? 1.78 : flying ? 1.56 : 1.43, bottomExtent = flying ? 1.46 : wheelchair ? 1.22 : 1.05;
    var totalExtent = topExtent + bottomExtent, scale = Math.min(detail ? 3.2 : 2.7, (height - 8) / (enemy.radius * totalExtent));
    var centerX = x + width / 2, centerY = y + height / 2;
    var modelY = centerY + (topExtent - bottomExtent) * enemy.radius * scale / 2;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, width, height); ctx.clip();
    ctx.translate(centerX, modelY); ctx.scale(scale, scale); ctx.translate(-centerX, -modelY);
    Game.drawEnemies({ type: id, x: centerX, y: modelY, hp: enemy.hp, maxHp: enemy.hp, hitFlash: 0, slow: 0, hideHealthBar: true, armorCharges: enemy.armorCharges || 0, armorFlash: 0 });
    ctx.restore();
  }

  Game.drawWall = function () {
    var wall = S.wall;
    if (!wall) return;
    var left = wall.x - wall.width / 2, top = wall.y - wall.height / 2;
    ctx.save();
    var healthy = wall.hp > wall.maxHp * .35;
    var frontHeight = 56;
    var wallGradient = ctx.createLinearGradient(0, top, 0, top + frontHeight);
    wallGradient.addColorStop(0, healthy ? "#607a7d" : "#875861");
    wallGradient.addColorStop(.22, healthy ? "#3e5960" : "#68474f");
    wallGradient.addColorStop(1, healthy ? "#1d313b" : "#3b2933");
    var metalGradient = ctx.createLinearGradient(0, top - 8, 0, top + 9);
    metalGradient.addColorStop(0, "#b9d1c8"); metalGradient.addColorStop(.45, "#6d898b"); metalGradient.addColorStop(1, "#2a424a");

    // 地面投影和墙体底部厚度。
    ctx.shadowColor = "rgba(0, 0, 0, .62)"; ctx.shadowBlur = 20; ctx.shadowOffsetY = 10;
    ctx.fillStyle = "rgba(0, 0, 0, .58)"; ctx.fillRect(left + 5, top + 11, wall.width, frontHeight + 8);
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.fillStyle = "#14262f"; ctx.fillRect(left + 3, top + frontHeight, wall.width - 1, 10);

    // 前面板、上斜面和左右侧面共同组成城墙的立体轮廓。
    ctx.fillStyle = wallGradient; ctx.fillRect(left, top + 5, wall.width, frontHeight);
    ctx.fillStyle = healthy ? "#6b8586" : "#80535b";
    ctx.beginPath(); ctx.moveTo(left, top + 5); ctx.lineTo(left + wall.width, top + 5); ctx.lineTo(left + wall.width - 10, top - 7); ctx.lineTo(left + 10, top - 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(235, 255, 243, .28)";
    ctx.beginPath(); ctx.moveTo(left + 10, top - 7); ctx.lineTo(left + wall.width - 10, top - 7); ctx.lineTo(left + wall.width - 10, top - 3); ctx.lineTo(left + 14, top - 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = healthy ? "#213c46" : "#4b3038";
    ctx.beginPath(); ctx.moveTo(left, top + 5); ctx.lineTo(left + 10, top - 7); ctx.lineTo(left + 10, top + 1); ctx.lineTo(left + 5, top + 9); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(left + wall.width, top + 5); ctx.lineTo(left + wall.width - 10, top - 7); ctx.lineTo(left + wall.width - 10, top + 1); ctx.lineTo(left + wall.width - 5, top + 9); ctx.closePath(); ctx.fill();

    // 内嵌装甲板和斜向高光。
    for (var panelX = left + 7; panelX < left + wall.width - 7; panelX += 47) {
      ctx.fillStyle = "rgba(5, 16, 23, .46)"; ctx.fillRect(panelX, top + 17, 39, 31);
      ctx.strokeStyle = "rgba(170, 211, 207, .25)"; ctx.lineWidth = 1; ctx.strokeRect(panelX, top + 17, 39, 31);
      ctx.fillStyle = "rgba(104, 216, 255, .09)"; ctx.fillRect(panelX + 6, top + 23, 27, 2);
      ctx.fillStyle = "rgba(231, 255, 244, .13)";
      ctx.beginPath(); ctx.moveTo(panelX + 5, top + 45); ctx.lineTo(panelX + 24, top + 18); ctx.lineTo(panelX + 30, top + 18); ctx.lineTo(panelX + 11, top + 45); ctx.closePath(); ctx.fill();
    }

    // 顶部模块、立柱和铆钉，强调金属城墙的厚度。
    for (var capX = left + 9; capX < left + wall.width - 14; capX += 70) {
      U.roundedRect(ctx, capX, top - 11, 29, 15, 4, metalGradient, "#d3e4d8");
      U.roundedRect(ctx, capX + 5, top - 6, 19, 6, 2, "#26383f", "rgba(220, 255, 235, .35)");
    }
    for (var pillarX = left + 1; pillarX < left + wall.width; pillarX += 94) {
      var pillarGradient = ctx.createLinearGradient(pillarX, 0, pillarX + 12, 0);
      pillarGradient.addColorStop(0, "#172a33"); pillarGradient.addColorStop(.5, "#839b99"); pillarGradient.addColorStop(1, "#293f47");
      ctx.fillStyle = pillarGradient; ctx.fillRect(pillarX, top + 7, 12, frontHeight + 2);
      ctx.strokeStyle = "rgba(211, 235, 222, .38)"; ctx.strokeRect(pillarX, top + 7, 12, frontHeight + 2);
    }
    ctx.fillStyle = "#d0e0d6";
    for (var boltX = left + 12; boltX < left + wall.width; boltX += 47) {
      ctx.beginPath(); ctx.arc(boltX, top + 22, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(boltX, top + 48, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = healthy ? "rgba(210, 245, 229, .72)" : "rgba(255, 167, 167, .72)";
    ctx.lineWidth = 2; ctx.strokeRect(left, top + 5, wall.width, frontHeight);

    // 城墙耐久条位于城墙上沿，避免和顶部 HUD 争夺空间。
    U.roundedRect(ctx, left + 34, top - 25, wall.width - 68, 8, 4, "rgba(0, 0, 0, .72)");
    U.roundedRect(ctx, left + 34, top - 25, (wall.width - 68) * U.clamp(wall.hp / wall.maxHp, 0, 1), 8, 4, healthy ? C.colors.green : C.colors.red);
    text("城墙 " + Math.ceil(wall.hp) + " / " + wall.maxHp, wall.x, top - 30, "bold 10px Segoe UI, Microsoft YaHei", C.colors.text, "center");
    ctx.restore();
  };

  Game.drawSkillRing = function () {
    if (!S.player) return;
    var time = S.session ? S.session.elapsed : 0, ring = C.skillRing || {}, x = C.width / 2 + (ring.offsetX || 64), y = C.height + (ring.offsetY || -100) + Math.sin(time * 2.4) * 2, orbit = time * .8;
    ctx.save();

    // 小型幻形悬浮在人物右侧，阴影与主体分离，避免再像一块巨大的平面圆盘。
    ctx.fillStyle = "rgba(0, 0, 0, .42)";
    ctx.beginPath(); ctx.ellipse(x, y + 18, 18, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(104, 216, 255, .34)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y + 12); ctx.lineTo(x, y + 16); ctx.stroke();

    // 蓝灰色机体和上下错层的腹部。
    var droneGradient = ctx.createLinearGradient(x - 18, y - 13, x + 16, y + 15);
    droneGradient.addColorStop(0, "#e1f1e5"); droneGradient.addColorStop(.28, "#91b7b8"); droneGradient.addColorStop(.62, "#527783"); droneGradient.addColorStop(1, "#1d3b49");
    ctx.shadowColor = "rgba(104, 216, 255, .42)"; ctx.shadowBlur = 9;
    ctx.fillStyle = "#183641";
    ctx.beginPath(); ctx.ellipse(x, y + 4, 18, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = droneGradient;
    ctx.beginPath(); ctx.moveTo(x - 17, y - 3); ctx.quadraticCurveTo(x - 12, y - 16, x, y - 14); ctx.quadraticCurveTo(x + 12, y - 16, x + 17, y - 3); ctx.lineTo(x + 12, y + 11); ctx.quadraticCurveTo(x, y + 19, x - 12, y + 11); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(221, 255, 241, .68)"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = "rgba(234, 255, 239, .36)";
    ctx.beginPath(); ctx.moveTo(x - 11, y - 7); ctx.quadraticCurveTo(x - 3, y - 13, x + 6, y - 9); ctx.lineTo(x + 3, y - 5); ctx.lineTo(x - 9, y - 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#244956";
    ctx.beginPath(); ctx.ellipse(x, y + 10, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#213a45"; ctx.fillRect(x - 11, y + 1, 22, 5);

    // 两侧机械臂、关节和悬浮翼，形成参考图中的小型伙伴轮廓。
    ctx.strokeStyle = "#294f5c"; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x - 13, y - 5); ctx.lineTo(x - 20, y - 12); ctx.lineTo(x - 22, y - 20); ctx.moveTo(x + 13, y - 5); ctx.lineTo(x + 20, y - 12); ctx.lineTo(x + 22, y - 20); ctx.stroke();
    ctx.fillStyle = "#b2ccca"; ctx.strokeStyle = "#274c58"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x - 22, y - 21, 4, 0, Math.PI * 2); ctx.arc(x + 22, y - 21, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#6b9698";
    ctx.beginPath(); ctx.arc(x - 20, y - 12, 3, 0, Math.PI * 2); ctx.arc(x + 20, y - 12, 3, 0, Math.PI * 2); ctx.fill();

    // 中央能量眼和微型旋转幻形。
    ctx.shadowColor = "rgba(104, 216, 255, .95)"; ctx.shadowBlur = 10;
    ctx.fillStyle = "#15323e";
    ctx.beginPath(); ctx.arc(x, y + 5, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#9ffff1";
    ctx.beginPath(); ctx.arc(x, y + 5, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.colors.cyan;
    ctx.beginPath(); ctx.arc(x, y + 5, 2, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(orbit);
    ctx.globalAlpha = .72; ctx.strokeStyle = "#b7fff1"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(4, -11); ctx.lineTo(0, -8); ctx.lineTo(-4, -11); ctx.closePath(); ctx.stroke();
    ctx.globalAlpha = .34; ctx.fillStyle = "#8fe8df"; ctx.fill();
    ctx.restore();
    ctx.restore();
  };

  Game.drawEffects = function () {
    var beamSkill = S.player && S.player.skills.highEnergyBeam;
    if (beamSkill && beamSkill.active) {
      var beamPulse = .9 + Math.sin(S.session.elapsed * 38) * .1;
      ctx.save(); ctx.lineCap = "round"; ctx.globalAlpha = .2 * beamPulse; ctx.strokeStyle = "#38aaff"; ctx.shadowColor = "#3dbdff"; ctx.shadowBlur = 20; ctx.lineWidth = beamSkill.beamWidth + 12;
      ctx.beginPath(); ctx.moveTo(beamSkill.activeX, beamSkill.activeY); ctx.lineTo(beamSkill.activeX2, beamSkill.activeY2); ctx.stroke();
      ctx.globalAlpha = .72 * beamPulse; ctx.strokeStyle = "#278fff"; ctx.shadowBlur = 12; ctx.lineWidth = beamSkill.beamWidth;
      ctx.beginPath(); ctx.moveTo(beamSkill.activeX, beamSkill.activeY); ctx.lineTo(beamSkill.activeX2, beamSkill.activeY2); ctx.stroke();
      ctx.globalAlpha = .96; ctx.strokeStyle = "#b9f5ff"; ctx.shadowColor = "#91efff"; ctx.shadowBlur = 8; ctx.lineWidth = Math.max(2, beamSkill.beamWidth * .28);
      ctx.beginPath(); ctx.moveTo(beamSkill.activeX, beamSkill.activeY); ctx.lineTo(beamSkill.activeX2, beamSkill.activeY2); ctx.stroke(); ctx.restore();
    }
    (S.bombZones || []).forEach(function (zone) {
      var fade = U.clamp(zone.life / zone.duration, 0, 1), pulse = .96 + Math.sin(S.session.elapsed * 7) * .04;
      ctx.save(); ctx.globalAlpha = .2 + fade * .13; ctx.fillStyle = "#ff6a32"; ctx.beginPath(); ctx.arc(zone.x, zone.y, zone.radius * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = .22 + fade * .3; ctx.strokeStyle = "#ffbe5e"; ctx.lineWidth = 3; ctx.setLineDash([7, 5]); ctx.beginPath(); ctx.arc(zone.x, zone.y, zone.radius * pulse, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    });
    (S.electromagneticZones || []).forEach(function (zone) {
      var fade = U.clamp(zone.life / zone.duration, 0, 1), pulse = .94 + Math.sin(S.session.elapsed * 9) * .06;
      ctx.save(); ctx.globalAlpha = .18 + fade * .16; ctx.fillStyle = "#51d9ff"; ctx.beginPath(); ctx.arc(zone.x, zone.y, zone.radius * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = .4 + fade * .35; ctx.strokeStyle = "#8df3ff"; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(zone.x, zone.y, zone.radius * pulse, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.translate(zone.x, zone.y); ctx.rotate(S.session.elapsed * 1.6); ctx.globalAlpha = .55 + fade * .25; ctx.strokeStyle = "#c5ffff"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-zone.radius * .72, 0); ctx.lineTo(zone.radius * .72, 0); ctx.moveTo(0, -zone.radius * .72); ctx.lineTo(0, zone.radius * .72); ctx.stroke(); ctx.restore();
    });
    (S.explosions || []).forEach(function (explosion) {
      if (explosion.type === "chainSpark") {
        var sparkProgress = 1 - U.clamp(explosion.life / explosion.duration, 0, 1), sparkRadius = explosion.radius * (.5 + sparkProgress * .9);
        ctx.save();
        ctx.globalAlpha = (1 - sparkProgress) * .8;
        ctx.strokeStyle = "#efe4ff"; ctx.shadowColor = "#b98cff"; ctx.shadowBlur = 14; ctx.lineWidth = Math.max(1.5, 3 * (1 - sparkProgress));
        ctx.beginPath(); ctx.arc(explosion.x, explosion.y, sparkRadius, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = (1 - sparkProgress) * .5;
        ctx.lineWidth = Math.max(1, 1.6 * (1 - sparkProgress));
        for (var spoke = 0; spoke < 4; spoke++) {
          var spokeAngle = Math.PI / 4 + spoke * Math.PI / 2;
          ctx.beginPath();
          ctx.moveTo(explosion.x + Math.cos(spokeAngle) * sparkRadius * .8, explosion.y + Math.sin(spokeAngle) * sparkRadius * .8);
          ctx.lineTo(explosion.x + Math.cos(spokeAngle) * sparkRadius * 1.5, explosion.y + Math.sin(spokeAngle) * sparkRadius * 1.5);
          ctx.stroke();
        }
        ctx.restore();
        return;
      }
      if (explosion.type === "electromagneticStrike") {
        var strikeProgress = 1 - U.clamp(explosion.life / explosion.duration, 0, 1);
        ctx.save(); ctx.globalAlpha = 1 - strikeProgress; ctx.shadowColor = "#9bffff"; ctx.shadowBlur = 16; ctx.strokeStyle = "#d8ffff"; ctx.lineWidth = 3; ctx.lineJoin = "round";
        ctx.beginPath(); ctx.moveTo(explosion.x, -18); ctx.lineTo(explosion.x - 7, explosion.y - 76); ctx.lineTo(explosion.x + 5, explosion.y - 48); ctx.lineTo(explosion.x - 3, explosion.y - 24); ctx.lineTo(explosion.x, explosion.y); ctx.stroke();
        ctx.strokeStyle = "#6dd8ff"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(explosion.x + 9, -12); ctx.lineTo(explosion.x + 2, explosion.y - 54); ctx.lineTo(explosion.x + 8, explosion.y - 24); ctx.stroke(); ctx.restore();
        return;
      }
      var progress = 1 - U.clamp(explosion.life / explosion.duration, 0, 1), radius = explosion.radius * (.45 + progress * .55);
      ctx.save(); ctx.globalAlpha = (1 - progress) * .62;
      ctx.fillStyle = explosion.type === "bombardment" ? "rgba(255, 174, 54, .48)" : explosion.type === "electromagnetic" ? "rgba(77, 213, 255, .48)" : explosion.type === "hailFrost" ? "rgba(143, 233, 255, .46)" : explosion.type === "fuelBlast" ? "rgba(255, 132, 44, .5)" : "rgba(255, 75, 42, .42)"; ctx.beginPath(); ctx.arc(explosion.x, explosion.y, radius, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1 - progress; ctx.strokeStyle = explosion.type === "bombardment" ? "#fff0a0" : explosion.type === "electromagnetic" ? "#d2ffff" : explosion.type === "hailFrost" ? "#eafcff" : explosion.type === "fuelBlast" ? "#ffe6b0" : "#ffbf6b"; ctx.lineWidth = Math.max(2, 8 * (1 - progress));
      ctx.beginPath(); ctx.arc(explosion.x, explosion.y, radius * .84, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    });
    S.particles.forEach(function (particle) { ctx.globalAlpha = U.clamp(particle.life / particle.maxLife, 0, 1); ctx.fillStyle = particle.color; ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2); ctx.fill(); });
    ctx.globalAlpha = 1;
    S.texts.forEach(function (item) { ctx.globalAlpha = U.clamp(item.life, 0, 1); text(item.text, item.x, item.y, "bold 11px Segoe UI, Microsoft YaHei", item.color, "center"); });
    ctx.globalAlpha = 1;
  };

  Game.drawBombardment = function () {
    (S.bombDrops || []).forEach(function (bomb) {
      var pulse = .97 + Math.sin(S.session.elapsed * 8) * .03;
      ctx.save(); ctx.globalAlpha = .38; ctx.strokeStyle = "#ffbd58"; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.arc(bomb.targetX, bomb.targetY, bomb.radius * pulse, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      if (bomb.delay > 0) return;
      ctx.save(); ctx.strokeStyle = "rgba(255, 118, 49, .72)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bomb.x, bomb.y - 18); ctx.lineTo(bomb.x, bomb.y - 7); ctx.stroke();
      ctx.shadowColor = "#ffb74f"; ctx.shadowBlur = 12; U.roundedRect(ctx, bomb.x - 6, bomb.y - 8, 12, 20, 4, "#39434a", "#ffd26a");
      ctx.shadowBlur = 0; ctx.fillStyle = "#ff7737"; ctx.beginPath(); ctx.moveTo(bomb.x - 4, bomb.y + 11); ctx.lineTo(bomb.x + 4, bomb.y + 11); ctx.lineTo(bomb.x, bomb.y + 20); ctx.closePath(); ctx.fill(); ctx.restore();
    });
  };

  Game.drawHud = function () {
    var p = S.player, session = S.session;
    if (!p || S.screen === "menu" || S.screen === "zombieCodex" || S.screen === "skillCodex" || S.screen === "attributes" || S.screen === "equipment" || S.screen === "wall" || S.screen === "gems") return;
    var level = C.levels.find(function (item) { return item.id === session.level; });
    Game.drawPauseButton(14, 15, 28, 28);
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, .72)"; ctx.shadowBlur = 6;
    text(session.testArena ? "测试场" : level ? level.id + " " + level.name : "未知区域", C.width / 2, 27, "bold 15px Segoe UI, Microsoft YaHei", C.colors.text, "center");
    text(session.testArena ? "自由战斗" : "第 " + session.wave + " / " + session.waves.length + " 波", C.width - 14, 25, "bold 9px Segoe UI, Microsoft YaHei", C.colors.muted, "right");
    ctx.restore();
    U.roundedRect(ctx, 54, 40, 148, 8, 4, "rgba(255,255,255,.12)");
    U.roundedRect(ctx, 54, 40, 148 * U.clamp(p.xp / p.nextXp, 0, 1), 8, 4, C.colors.cyan);
    text(p.level >= C.maxLevel ? "LV.MAX · 剩余 " + Game.getRemainingEnemyCount() : "LV." + p.level + "  " + Math.floor(p.xp) + " / " + p.nextXp + " XP", 128, 58, "9px Segoe UI, Microsoft YaHei", C.colors.muted, "center");
    var rifleIcon = Game.sprites.images.playerRifle, ammoColor = p.reloadTimer > 0 ? C.colors.yellow : p.ammo <= 5 ? C.colors.red : C.colors.cyan;
    U.roundedRect(ctx, 286, 10, 68, 20, 7, p.rifleEnabled === false ? "rgba(83, 35, 43, .94)" : "rgba(24, 65, 76, .94)", p.rifleEnabled === false ? C.colors.red : C.colors.cyan);
    text(p.rifleEnabled === false ? "开启步枪" : "关闭步枪", 320, 23, "bold 8px Segoe UI, Microsoft YaHei", C.colors.text, "center");
    if (rifleIcon) {
      ctx.save(); ctx.translate(268, 30); ctx.rotate(Math.PI / 2); ctx.drawImage(rifleIcon, -4, -15, 8, 30); ctx.restore();
    } else {
      ctx.save(); ctx.strokeStyle = ammoColor; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(254, 30); ctx.lineTo(282, 30); ctx.stroke(); ctx.fillStyle = ammoColor; ctx.fillRect(258, 28, 13, 5); ctx.fillRect(265, 32, 4, 5); ctx.restore();
    }
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, .72)"; ctx.shadowBlur = 5;
    text(p.ammo + "\\" + p.magazineSize, C.width - 14, 34, "bold 11px Segoe UI, Microsoft YaHei", ammoColor, "right");
    ctx.restore();
    if (p.reloadTimer > 0) {
      U.roundedRect(ctx, 300, 38, 36, 3, 2, "rgba(255,255,255,.14)");
      U.roundedRect(ctx, 300, 38, 36 * (1 - p.reloadTimer / p.reloadDuration), 3, 2, C.colors.yellow);
    }
    drawSkillSlots(p);
    var boss = S.enemies.find(function (enemy) { return enemy.type === "boss"; });
    if (boss) badge("BOSS  ·  尸潮领主", 104, 88, 152, C.colors.red);
    if (session.messageTimer > 0) text(session.message, C.width / 2, boss ? 132 : 108, "bold 16px Segoe UI, Microsoft YaHei", C.colors.yellow, "center");
  };

  Game.drawPauseButton = function (x, y, w, h) {
    ctx.save();
    U.roundedRect(ctx, x, y, w, h, 9, "rgba(28, 65, 76, .92)", "rgba(153, 205, 218, .55)");
    ctx.fillStyle = C.colors.text;
    var barW = Math.max(3, w * .16), barH = h * .52, barY = y + (h - barH) / 2;
    ctx.fillRect(x + w * .3, barY, barW, barH); ctx.fillRect(x + w * .52, barY, barW, barH);
    ctx.restore();
  };

  var testEnemyChips = null;
  function buildTestEnemyPicker() {
    if (testEnemyChips) return;
    var host = document.getElementById("test-enemy-rows");
    if (!host || !host.appendChild || typeof document.createElement !== "function") return;
    testEnemyChips = [];
    [{ category: "minion", label: "小怪" }, { category: "elite", label: "精英" }, { category: "boss", label: "首领" }].forEach(function (group) {
      var row = document.createElement("div"), label = document.createElement("span"), list = document.createElement("div");
      row.className = "test-enemy-row";
      label.className = "test-enemy-label";
      label.textContent = group.label;
      list.className = "test-enemy-list";
      Object.keys(C.enemies).forEach(function (id) {
        if (C.enemies[id].codexCategory !== group.category) return;
        var chip = document.createElement("button");
        chip.type = "button";
        chip.className = "test-enemy-chip";
        chip.setAttribute("data-enemy-id", id);
        chip.textContent = C.enemies[id].name;
        list.appendChild(chip);
        testEnemyChips.push({ id: id, node: chip });
      });
      row.appendChild(label);
      row.appendChild(list);
      host.appendChild(row);
    });
  }
  Game.updateTestControls = function () {
    var arena = S.testArena, controls = document.getElementById("test-controls"), ids, type, info, skill, traits, trait, skillLabel, traitLabel;
    function setText(id, value) {
      var node = document.getElementById(id);
      if (node && node.textContent !== value) node.textContent = value;
    }
    if (!controls) return;
    controls.hidden = S.screen !== "testArena" || !arena;
    if (controls.hidden) return;
    controls.classList.toggle("collapsed", !arena.controlsVisible);
    buildTestEnemyPicker();
    ids = Game.getTestEnemyIds();
    type = ids[arena.enemyIndex];
    info = type ? C.enemies[type] : null;
    skill = C.coreSkills[arena.skillIndex];
    traits = (C.skillTraits || []).filter(function (item) { return skill && item.skillId === skill.id && !item.unlocksSkill; });
    trait = traits[arena.traitIndex];
    skillLabel = skill ? skill.name + (S.player.skills[skill.id].unlocked ? " · Lv." + S.player.skills[skill.id].level : " · 未解锁") : "无可选技能";
    traitLabel = trait ? trait.name + " · " + (S.player.traits[trait.id] || 0) + "/" + trait.max : "无可选词条";
    setText("test-enemy-name", info ? info.name + " · 生命 " + info.hp + " · 移速 " + info.speed : "暂无敌人");
    setText("test-skill-name", skillLabel);
    setText("test-trait-name", traitLabel);
    setText("test-unlock-skill", skill && S.player.skills[skill.id].unlocked ? "所选技能已解锁" : "解锁所选技能");
    setText("test-rifle-toggle", S.player.rifleEnabled === false ? "开启步枪" : "关闭步枪");
    if (testEnemyChips) testEnemyChips.forEach(function (chip) { chip.node.classList.toggle("active", chip.id === type); });
  };

  Game.drawPause = function () {
    Game.overlay();
    panel(28, 190, C.width - 56, 248, "rgba(10, 35, 49, .96)", "rgba(153, 205, 218, .2)", 20);
    badge("BATTLE PAUSED", 105, 216, 150, C.colors.cyan);
    text("战斗暂停", C.width / 2, 273, "bold 29px Segoe UI, Microsoft YaHei", C.colors.text, "center");
    text("尸潮和子弹都已停止", C.width / 2, 299, "13px Segoe UI, Microsoft YaHei", C.colors.muted, "center");
    Game.button(C.width / 2 - 82, 326, 164, 44, "继续战斗", C.colors.green);
    Game.button(C.width / 2 - 82, 382, 164, 40, "退出关卡", C.colors.red);
  };

  Game.overlay = function () { ctx.fillStyle = "rgba(3, 9, 13, .84)"; ctx.fillRect(0, 0, C.width, C.height); };
  Game.button = function (x, y, w, h, label, color) { var gradient = ctx.createLinearGradient(x, y, x, y + h); gradient.addColorStop(0, color); gradient.addColorStop(1, "#2c9d91"); ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 16; U.roundedRect(ctx, x, y, w, h, 13, gradient); ctx.restore(); text(label, x + w / 2, y + h / 2 + 5, "bold 15px Segoe UI, Microsoft YaHei", "#071217", "center"); };
  function pad2(value) { return value < 10 ? "0" + value : "" + value; }

  function recordSummary(row) {
    var parts = [];
    if (row.completed) parts.push("已通关");
    if (row.bestTime !== null && row.bestTime !== undefined) parts.push("最佳 " + U.formatTime(row.bestTime));
    if (row.bestKills !== null && row.bestKills !== undefined) parts.push("击杀 " + row.bestKills);
    if (!parts.length) parts.push("尝试 " + (row.attempts || 0) + " 次");
    return parts.join(" · ");
  }

  function drawMenuAccount() {
    var circle = C.menu.accountCircle, status = Game.accounts.getStatus();
    var color = status === "ready" ? C.colors.green : status === "offline" ? C.colors.red : C.colors.cyan;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(13, 34, 46, .94)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.restore();
    text("账户", circle.x, circle.y + 4, "bold 10px Segoe UI, Microsoft YaHei", C.colors.text, "center");
  }

  Game.drawMenu = function () {
    var menu = C.menu, buttons = menu.buttons;
    Game.overlay();
    drawMenuAccount();
    panel(menu.panelX, menu.panelY, menu.panelWidth, menu.panelHeight, "rgba(10, 35, 49, .78)", "rgba(153, 205, 218, .18)", 20);
    badge("SURVIVAL  PROTOCOL", 102, 104, 156, C.colors.cyan);
    text("街区警戒线", C.width / 2, 164, "bold 31px Segoe UI, Microsoft YaHei", C.colors.yellow, "center");
    text("竖屏僵尸生存射击", C.width / 2, 194, "15px Segoe UI, Microsoft YaHei", C.colors.text, "center");
    text("步枪自动锁定目标 · 点击画面调整方向", C.width / 2, 226, "12px Segoe UI, Microsoft YaHei", C.colors.muted, "center");
    Game.button(buttons.start.x, buttons.start.y, buttons.start.w, buttons.start.h, "开始战斗", C.colors.green);
    Game.button(buttons.levelSelect.x, buttons.levelSelect.y, buttons.levelSelect.w, buttons.levelSelect.h, "选择关卡", C.colors.cyan);
    Game.button(buttons.testArena.x, buttons.testArena.y, buttons.testArena.w, buttons.testArena.h, "进入测试场", C.colors.yellow);
    Game.button(buttons.attributes.x, buttons.attributes.y, buttons.attributes.w, buttons.attributes.h, "属性面板", "#68d8ff");
    Game.button(buttons.skillCodex.x, buttons.skillCodex.y, buttons.skillCodex.w, buttons.skillCodex.h, "技能图鉴", C.colors.purple);
    Game.button(buttons.zombieCodex.x, buttons.zombieCodex.y, buttons.zombieCodex.w, buttons.zombieCodex.h, "僵尸图鉴", "#58aaff");
  };

  Game.drawAccountBanner = function () {
    var note = Game.accounts.getStatusNote();
    if (!note) return;
    var offline = Game.accounts.getStatus() === "offline";
    var color = offline ? C.colors.red : C.colors.yellow;
    var left = S.screen === "menu" ? (C.menu.bannerLeft || 0) : 0;
    var width = U.clamp(note.length * 12 + 26, 160, Math.min(260, C.width - left - 12));
    var x = left + (C.width - left - 12 - width) / 2;
    U.roundedRect(ctx, x, C.menu.bannerY, width, C.menu.bannerHeight, 11, "rgba(5, 16, 23, .86)", color);
    text(note, x + width / 2, C.menu.bannerY + 15, "bold 10px Segoe UI, Microsoft YaHei", color, "center");
  };

  function drawFakeField(rect, label, value, placeholder) {
    text(label, rect.x, rect.y - 8, "bold 11px Segoe UI, Microsoft YaHei", C.colors.cyan);
    U.roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 10, "rgba(13, 34, 46, .92)", "rgba(153, 205, 218, .22)");
    if (value) text(value, rect.x + 12, rect.y + rect.h / 2 + 5, "13px Segoe UI, Microsoft YaHei", C.colors.text);
    else text(placeholder, rect.x + 12, rect.y + rect.h / 2 + 5, "13px Segoe UI, Microsoft YaHei", C.colors.muted);
  }

  Game.drawLogin = function () {
    var ui = C.accountUI, login = ui.login, status = Game.accounts.getStatus();
    var register = S.accountMode === "register";
    Game.overlay();
    panel(ui.panelX, ui.panelY, ui.panelWidth, ui.panelHeight, "rgba(10, 35, 49, .96)", "rgba(153, 205, 218, .22)", 20);
    badge("ACCOUNT ACCESS", 105, 70, 150, C.colors.cyan);
    text(register ? "注册账户" : "登录账户", C.width / 2, 118, "bold 25px Segoe UI, Microsoft YaHei", C.colors.yellow, "center");
    text(status === "offline" ? "未连接数据库 · 战斗仍可进行，成绩不会保存" : "登录后关卡进度与资源会保存到本机数据库", C.width / 2, 144, "11px Segoe UI, Microsoft YaHei", C.colors.muted, "center");
    drawFakeField(login.userName, "用户名", Game.accounts.getUsername(), "点击输入用户名");
    drawFakeField(login.password, "密码", "", "点击输入密码");
    text(Game.accounts.state.error || "", C.width / 2, 332, "bold 11px Segoe UI, Microsoft YaHei", C.colors.red, "center");
    Game.button(login.submit.x, login.submit.y, login.submit.w, login.submit.h, register ? "注册并登录" : "登录", C.colors.green);
    Game.button(login.switchMode.x, login.switchMode.y, login.switchMode.w, login.switchMode.h, register ? "已有账户？去登录" : "没有账户？去注册", "#4b7180");
    text("用户名 2–16 个中文 / 字母 / 数字 / 下划线", C.width / 2, 458, "10px Segoe UI, Microsoft YaHei", C.colors.muted, "center");
    text("密码至少 6 位 · 表单项在画布上的输入浮层中填写", C.width / 2, 474, "10px Segoe UI, Microsoft YaHei", C.colors.muted, "center");
    Game.button(ui.back.x, ui.back.y, ui.back.w, ui.back.h, "返回首页", "#4b7180");
  };

  Game.drawAccount = function () {
    var ui = C.accountUI, box = ui.account;
    var resources = Game.accounts.getResourceList(), records = Game.accounts.getLevelRecords(), totals = Game.accounts.getTotals();
    Game.overlay();
    panel(ui.panelX, ui.panelY, ui.panelWidth, ui.panelHeight, "rgba(10, 35, 49, .96)", "rgba(153, 205, 218, .22)", 20);
    badge("ACCOUNT", 120, 70, 120, C.colors.cyan);
    text("账户中心", C.width / 2, 118, "bold 25px Segoe UI, Microsoft YaHei", C.colors.yellow, "center");
    panel(38, box.cardY, 284, box.cardHeight, "rgba(17, 47, 62, .94)", "rgba(104, 216, 255, .22)", 14);
    text(Game.accounts.getUsername(), 54, box.cardY + 30, "bold 20px Segoe UI, Microsoft YaHei", C.colors.text);
    text("注册于 " + (Game.accounts.getCreatedAt() ? String(Game.accounts.getCreatedAt()).slice(0, 10) : "—"), 54, box.cardY + 50, "11px Segoe UI, Microsoft YaHei", C.colors.muted);
    text("通关 " + Game.accounts.getCompletedCount() + " / " + C.levels.length + "   ·   累计通关 " + totals.wins + " 次   ·   尝试 " + totals.attempts + " 次", 54, box.cardY + 68, "11px Segoe UI, Microsoft YaHei", C.colors.cyan);
    text("资源", 44, box.resourceY - 6, "bold 12px Segoe UI, Microsoft YaHei", C.colors.cyan);
    panel(38, box.resourceY, 284, box.resourceHeight, "rgba(13, 34, 46, .92)", "rgba(153, 205, 218, .16)", 14);
    resources.forEach(function (item, index) {
      var column = index % 4, line = Math.floor(index / 4), x = 48 + column * 72, y = box.resourceY + 18 + line * 24;
      dot(x - 7, y - 4, 4, item.color, "rgba(255, 255, 255, .24)");
      text(item.name, x, y, "9px Segoe UI, Microsoft YaHei", C.colors.muted);
      text(String(item.amount), x, y + 12, "bold 11px Segoe UI, Microsoft YaHei", item.color);
    });
    text("关卡记录", 44, box.recordY - 12, "bold 12px Segoe UI, Microsoft YaHei", C.colors.cyan);
    if (!records.length) text("暂无记录 · 通关一局后会自动出现在这里", 44, box.recordY + 8, "11px Segoe UI, Microsoft YaHei", C.colors.muted);
    records.slice(-(C.accounts.maxRecords || 5)).forEach(function (row, index) {
      var level = C.levels.filter(function (item) { return item.id === row.levelId; })[0];
      var y = box.recordY + 8 + index * box.recordStep;
      text(pad2(row.levelId), 44, y, "bold 11px Segoe UI, Microsoft YaHei", row.completed ? C.colors.green : C.colors.muted);
      text(level ? level.name : "关卡 " + row.levelId, 70, y, "11px Segoe UI, Microsoft YaHei", C.colors.text);
      text(recordSummary(row), 322, y, "10px Segoe UI, Microsoft YaHei", C.colors.muted, "right");
    });
    if (Game.accounts.state.notice) text(Game.accounts.state.notice, C.width / 2, 508, "10px Segoe UI, Microsoft YaHei", C.colors.green, "center");
    Game.button(box.importButton.x, box.importButton.y, box.importButton.w, box.importButton.h, "导入旧进度", "#4b7180");
    Game.button(box.logoutButton.x, box.logoutButton.y, box.logoutButton.w, box.logoutButton.h, "注销登录", "#4b7180");
    Game.button(box.deleteButton.x, box.deleteButton.y, box.deleteButton.w, box.deleteButton.h, "删除账户", C.colors.red);
    Game.button(ui.back.x, ui.back.y, ui.back.w, ui.back.h, "返回首页", "#4b7180");
  };
  function attributePercent(value) {
    var n = Math.round(value * 1000) / 10;
    return (n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)) + "%";
  }
  Game.drawAttributes = function () {
    var ui = C.attributesUI, a = Game.attributes.get(), center = C.width / 2;
    var stats = [
      { label: "攻击力", value: String(Math.round(a.attack)), color: C.colors.cyan },
      { label: "冷却缩减", value: attributePercent(a.cooldownReduction), color: C.colors.cyan },
      { label: "防线血量", value: String(a.wallMaxHp), color: C.colors.green },
      { label: "暴击率", value: attributePercent(a.critRate), color: C.colors.yellow },
      { label: "暴击伤害", value: attributePercent(a.critDamage), color: C.colors.yellow },
      { label: "负面时间", value: attributePercent(a.statusDurationMultiplier), color: C.colors.purple }
    ];
    Game.overlay();
    panel(ui.panelX, ui.panelY, ui.panelWidth, ui.panelHeight, "rgba(10, 35, 49, .96)", "rgba(153, 205, 218, .22)", 20);
    badge("SURVIVOR  ATTRIBUTES", 102, 70, 156, C.colors.cyan);
    text("角色属性", center, ui.titleY, "bold 25px Segoe UI, Microsoft YaHei", C.colors.yellow, "center");
    text("基础属性 + 装备 / 城墙 / 宝石加成 · 攻击力与元素攻击力为数值", center, ui.subtitleY, "11px Segoe UI, Microsoft YaHei", C.colors.muted, "center");
    for (var row = 0; row < 3; row++) {
      [0, 1].forEach(function (column) {
        var item = stats[row + column * 3], x = ui.statX[column], y = ui.statY[row];
        text(item.label, x, y, "10px Segoe UI, Microsoft YaHei", C.colors.muted);
        text(item.value, x, y + 20, "bold 18px Segoe UI, Microsoft YaHei", item.color);
      });
    }
    text("元素攻击力", 44, ui.elementTitleY, "bold 12px Segoe UI, Microsoft YaHei", C.colors.cyan);
    var elementIds = (ui.elementOrder || Object.keys(C.elements)).filter(function (id) { return !!C.elements[id]; });
    elementIds.forEach(function (id, index) {
      var column = index % 3, line = Math.floor(index / 3), x = ui.elementX[column], y = ui.elementY[line], info = C.elements[id];
      dot(x, y + 4, 4, info.color, "rgba(255, 255, 255, .24)");
      text(info.name + "系", x + 10, y + 8, "10px Segoe UI, Microsoft YaHei", C.colors.text);
      text(String(Math.round(a.elementAttack[id])), x + 10, y + 24, "bold 15px Segoe UI, Microsoft YaHei", info.color);
    });
    text("攻击与元素加成对直接命中与持续伤害生效", center, ui.noteY, "9px Segoe UI, Microsoft YaHei", C.colors.muted, "center");
    text("攻击 / 元素无上限 · 装备、城墙与宝石加成生效", center, ui.noteY + 16, "9px Segoe UI, Microsoft YaHei", C.colors.muted, "center");
    text("暴击仅作用于步枪", center, ui.noteY + 32, "9px Segoe UI, Microsoft YaHei", C.colors.muted, "center");
    Game.button(ui.equipment.x, ui.equipment.y, ui.equipment.w, ui.equipment.h, "装备", C.colors.yellow);
    Game.button(ui.gems.x, ui.gems.y, ui.gems.w, ui.gems.h, "宝石", C.colors.green);
    Game.button(ui.wall.x, ui.wall.y, ui.wall.w, ui.wall.h, "城墙", C.colors.cyan);
    Game.button(ui.back.x, ui.back.y, ui.back.w, ui.back.h, "返回", "#4b7180");
  };
  Game.drawEquipment = function () {
    var ui = C.equipmentUI, center = C.width / 2, slots = Game.equipment.getSlots();
    var state = Game.accounts.state, ready = Game.accounts.getStatus() === "ready";
    Game.overlay();
    panel(ui.panelX, ui.panelY, ui.panelWidth, ui.panelHeight, "rgba(10, 35, 49, .96)", "rgba(153, 205, 218, .22)", 20);
    badge("LOADOUT  ·  EQUIPMENT", 101, 70, 158, C.colors.yellow);
    text("装备强化", center, ui.titleY, "bold 25px Segoe UI, Microsoft YaHei", C.colors.yellow, "center");
    text("六部位 · 攻击与元素加成随等级提升", center, ui.subtitleY, "11px Segoe UI, Microsoft YaHei", C.colors.muted, "center");
    if (ready) {
      text("金币 " + (Game.accounts.getResources().coin || 0), 44, ui.resourceY, "bold 10px Segoe UI, Microsoft YaHei", C.colors.yellow);
      text("图纸按部位", 316, ui.resourceY, "10px Segoe UI, Microsoft YaHei", C.colors.muted, "right");
    } else {
      text("登录后可查看与强化装备", 44, ui.resourceY, "10px Segoe UI, Microsoft YaHei", C.colors.muted);
    }
    slots.forEach(function (slot, index) {
      var card = Game.getEquipmentCardRect(index), cost = slot.nextCost, button = Game.getEquipmentUpgradeRect(index);
      U.roundedRect(ctx, card.x, card.y, card.w, card.h, 12, "rgba(13, 34, 46, .94)", slot.color);
      dot(card.x + 16, card.y + 18, 5, slot.color, "rgba(255, 255, 255, .24)");
      text(slot.name, card.x + 28, card.y + 22, "bold 14px Segoe UI, Microsoft YaHei", C.colors.text);
      text(slot.level ? "Lv." + slot.level + " / " + slot.maxLevel : (ready ? "未获取" : "未登录"), card.x + card.w - 10, card.y + 21, "bold 10px Segoe UI, Microsoft YaHei", slot.level ? C.colors.cyan : C.colors.muted, "right");
      text("攻击 +" + slot.attackBonus, card.x + 12, card.y + 44, "11px Segoe UI, Microsoft YaHei", C.colors.text);
      text((slot.elementName || "—") + " +" + slot.elementBonus, card.x + card.w - 12, card.y + 44, "bold 11px Segoe UI, Microsoft YaHei", slot.elementColor, "right");
      if (slot.level && cost && !slot.maxed) {
        var coinNeed = Math.round(cost.coin || 0), blueprintNeed = Math.round(cost[slot.blueprintId] || 0);
        text("金币 " + slot.coin + "/" + coinNeed, card.x + 12, card.y + 64, "8px Segoe UI, Microsoft YaHei", slot.coin >= coinNeed ? C.colors.green : C.colors.red);
        text("图纸 " + slot.blueprint + "/" + blueprintNeed, card.x + 12, card.y + 76, "8px Segoe UI, Microsoft YaHei", slot.blueprint >= blueprintNeed ? C.colors.green : C.colors.red);
      } else if (slot.level && slot.maxed) {
        text("已满级", card.x + 12, card.y + 72, "bold 9px Segoe UI, Microsoft YaHei", C.colors.yellow);
      } else {
        text(ready ? "同步中" : "请先登录账户", card.x + 12, card.y + 72, "9px Segoe UI, Microsoft YaHei", C.colors.muted);
      }
      var label = !ready ? "未登录" : (!slot.level ? "未获取" : (slot.maxed ? "已满级" : (state.equipmentBusySlot === slot.id ? "强化中…" : "强化")));
      var enabled = ready && !!slot.level && !slot.maxed && !state.equipmentBusy;
      U.roundedRect(ctx, button.x, button.y, button.w, button.h, 7, enabled ? (slot.affordable ? C.colors.green : C.colors.yellow) : "rgba(38, 56, 66, .9)", enabled ? "rgba(255, 255, 255, .2)" : "rgba(153, 205, 218, .16)");
      text(label, button.x + button.w / 2, button.y + 14, "bold 10px Segoe UI, Microsoft YaHei", enabled ? "#071217" : C.colors.muted, "center");
    });
    var message = state.equipmentError || state.equipmentNotice || "材料：金币 + 部位专属图纸 · 关卡奖励产出";
    text(String(message).slice(0, 34), center, ui.noteY, "9px Segoe UI, Microsoft YaHei", state.equipmentError ? C.colors.red : (state.equipmentNotice ? C.colors.green : C.colors.muted), "center");
    var bagCount = Game.equipment.getBag().length;
    Game.button(ui.bag.x, ui.bag.y, ui.bag.w, ui.bag.h, bagCount ? "装备背包 · " + bagCount : "装备背包", "#4b7180");
    Game.button(ui.back.x, ui.back.y, ui.back.w, ui.back.h, "返回属性", "#4b7180");
  };
  Game.drawEquipmentBag = function () {
    var ui = C.equipmentBagUI, state = Game.accounts.state, center = C.width / 2;
    var ready = Game.accounts.getStatus() === "ready";
    var view = Game.equipment.getBagPart(S.equipmentBagPart);
    Game.overlay();
    panel(ui.panelX, ui.panelY, ui.panelWidth, ui.panelHeight, "rgba(10, 35, 49, .96)", "rgba(153, 205, 218, .22)", 20);
    badge("EQUIPMENT  ·  BAG", 105, 70, 150, C.colors.cyan);
    text("装备背包", center, ui.titleY, "bold 25px Segoe UI, Microsoft YaHei", C.colors.yellow, "center");
    text("换装只改元素 · 强化等级保留在部位", center, ui.subtitleY, "11px Segoe UI, Microsoft YaHei", C.colors.muted, "center");
    C.equipment.slots.forEach(function (slot, index) {
      var rect = Game.getEquipmentBagTabRect(index), active = slot.id === view.partId;
      U.roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 8, active ? "rgba(104, 216, 255, .22)" : "rgba(13, 34, 46, .9)", active ? C.colors.cyan : "rgba(153, 205, 218, .18)");
      text(slot.short, rect.x + rect.w / 2, rect.y + 18, "bold 12px Segoe UI, Microsoft YaHei", active ? C.colors.text : C.colors.muted, "center");
    });
    var summary = view.name + " Lv." + view.level + " · 当前 " + (view.equippedName || "未装备") + " · 背包 " + view.total + " 件";
    text(ready ? summary : "登录后可查看装备背包", 34, ui.summaryY, "11px Segoe UI, Microsoft YaHei", ready ? C.colors.text : C.colors.muted);
    view.rows.forEach(function (row, index) {
      var rect = Game.getEquipmentBagRowRect(index), button = Game.getEquipmentBagButtonRect(index);
      var dim = !row.count && !row.equipped;
      U.roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 10, row.equipped ? "rgba(27, 63, 78, .96)" : "rgba(13, 34, 46, .88)", row.equipped ? "rgba(99, 230, 160, .36)" : "rgba(153, 205, 218, .14)");
      dot(rect.x + 16, rect.y + rect.h / 2, 5, dim ? "rgba(154, 176, 188, .4)" : row.color);
      text(row.name, rect.x + 30, rect.y + rect.h / 2 + 4, "bold 12px Segoe UI, Microsoft YaHei", dim ? "rgba(154, 176, 188, .55)" : row.color);
      text("×" + row.count, rect.x + 170, rect.y + rect.h / 2 + 4, "11px Segoe UI, Microsoft YaHei", dim ? "rgba(154, 176, 188, .55)" : C.colors.text);
      var enabled = ready && !state.equipmentBagBusy && row.count > 0 && !row.equipped;
      U.roundedRect(ctx, button.x, button.y, button.w, button.h, 7, enabled ? C.colors.cyan : "rgba(38, 56, 66, .9)", enabled ? "rgba(255, 255, 255, .2)" : "rgba(153, 205, 218, .16)");
      var label = row.equipped ? "已装备" : (row.count ? (state.equipmentBagBusy ? "换装中…" : "装备") : "—");
      text(label, button.x + button.w / 2, button.y + 18, "bold 10px Segoe UI, Microsoft YaHei", enabled ? "#071217" : C.colors.muted, "center");
    });
    var message = state.equipmentBagError || state.equipmentBagNotice || "掉落装备会进入背包，同部位同元素可以重复持有";
    text(String(message).slice(0, 30), center, ui.noteY, "9px Segoe UI, Microsoft YaHei", state.equipmentBagError ? C.colors.red : (state.equipmentBagNotice ? C.colors.green : C.colors.muted), "center");
    Game.button(ui.back.x, ui.back.y, ui.back.w, ui.back.h, "返回装备", "#4b7180");
  };
  function drawSteelIcon(cx, cy, size) {
    var s = size, w = s * .44, h = s * .28;
    var top = cy - s * .32, waist = cy - s * .15, middle = cy + s * .02, bottom = middle + h;
    ctx.save();
    ctx.beginPath(); ctx.ellipse(cx, cy + s * .39, s * .47, s * .09, 0, 0, Math.PI * 2); ctx.fillStyle = "rgba(0, 0, 0, .26)"; ctx.fill();
    ctx.lineWidth = Math.max(1, s * .035); ctx.strokeStyle = "rgba(239, 247, 250, .66)";
    ctx.beginPath(); ctx.moveTo(cx - w, waist); ctx.lineTo(cx, middle); ctx.lineTo(cx, bottom); ctx.lineTo(cx - w, waist + h); ctx.closePath();
    ctx.fillStyle = "#8499a4"; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + w, waist); ctx.lineTo(cx, middle); ctx.lineTo(cx, bottom); ctx.lineTo(cx + w, waist + h); ctx.closePath();
    ctx.fillStyle = "#5d727e"; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx + w, waist); ctx.lineTo(cx, middle); ctx.lineTo(cx - w, waist); ctx.closePath();
    ctx.fillStyle = "#dce7ec"; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - w + s * .04, waist + s * .015); ctx.lineTo(cx - s * .02, middle + s * .06);
    ctx.strokeStyle = "rgba(255, 255, 255, .34)"; ctx.stroke();
    ctx.restore();
  }

  function drawRareEarthIcon(cx, cy, size) {
    var s = size, rx = s * .42, ry = s * .14, apex = cy - s * .46, baseY = cy + s * .30;
    var gradient = ctx.createLinearGradient(cx - rx, baseY, cx + rx, baseY);
    gradient.addColorStop(0, "#a97016"); gradient.addColorStop(.48, "#ffd166"); gradient.addColorStop(1, "#d99a22");
    ctx.save();
    ctx.beginPath(); ctx.ellipse(cx, baseY + ry * .72, rx * .92, ry * .56, 0, 0, Math.PI * 2); ctx.fillStyle = "rgba(0, 0, 0, .24)"; ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx, baseY, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = "#8a5c13"; ctx.fill();
    ctx.lineWidth = Math.max(1, s * .03); ctx.strokeStyle = "rgba(255, 233, 168, .68)"; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, apex); ctx.lineTo(cx - rx, baseY); ctx.ellipse(cx, baseY, rx, ry, 0, Math.PI, 0, true); ctx.closePath();
    ctx.fillStyle = gradient; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, apex); ctx.lineTo(cx - rx * .26, baseY - ry * .2);
    ctx.strokeStyle = "rgba(255, 247, 214, .72)"; ctx.lineWidth = Math.max(1, s * .04); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, baseY, rx, ry, 0, 0, Math.PI, false);
    ctx.strokeStyle = "rgba(255, 225, 150, .62)"; ctx.lineWidth = Math.max(1, s * .03); ctx.stroke();
    ctx.restore();
  }

  function drawMaterialIcon(kind, cx, cy, size) {
    if (kind === "rareEarth") drawRareEarthIcon(cx, cy, size);
    else drawSteelIcon(cx, cy, size);
  }

  function materialLabel(kind, label, x, y, color, align) {
    var font = "bold 10px Segoe UI, Microsoft YaHei";
    ctx.font = font;
    var left = align === "right" ? x - ctx.measureText(label).width : x;
    drawMaterialIcon(kind, left - 8, y - 3, 12);
    text(label, left, y, font, color, "left");
  }

  Game.drawWallPanel = function () {
    var ui = C.wallUI, center = C.width / 2, view = Game.wall.getView(), state = Game.accounts.state;
    var ready = Game.accounts.getStatus() === "ready" && view.ready;
    var bt = view.breakthrough, next = bt.atLevel, busy = state.wallBusy;
    var rare = ready && !view.maxed && bt.required;
    var material = rare ? "rareEarth" : "steel";
    Game.overlay();
    panel(ui.panelX, ui.panelY, ui.panelWidth, ui.panelHeight, "rgba(10, 35, 49, .96)", "rgba(153, 205, 218, .22)", 20);
    badge("DEFENSE  ·  WALL", 107, 70, 146, C.colors.cyan);
    text("城墙材料", center, ui.titleY, "bold 25px Segoe UI, Microsoft YaHei", C.colors.yellow, "center");
    text("钢材升级血量 · 每 10 级消耗稀土突破", center, ui.subtitleY, "11px Segoe UI, Microsoft YaHei", C.colors.muted, "center");
    if (ready) {
      materialLabel("steel", "钢材 " + view.steel, 48, ui.resourceY, "#c8d6dd");
      materialLabel("rareEarth", "稀土 " + view.rareEarth, 316, ui.resourceY, "#f2c14e", "right");
    } else {
      text("登录后可查看与强化城墙", 44, ui.resourceY, "10px Segoe UI, Microsoft YaHei", C.colors.muted);
    }

    var main = ui.mainCard;
    panel(main.x, main.y, main.w, main.h, "rgba(17, 47, 62, .94)", "rgba(104, 216, 255, .22)", 14);
    text("防线等级", main.x + 16, main.y + 22, "10px Segoe UI, Microsoft YaHei", C.colors.muted);
    text(ready ? "Lv." + view.level + " / " + view.maxLevel : "未登录", main.x + 16, main.y + 47, "bold 21px Segoe UI, Microsoft YaHei", ready ? C.colors.cyan : C.colors.muted);
    text("防线血量", main.x + 150, main.y + 22, "10px Segoe UI, Microsoft YaHei", C.colors.muted);
    text(ready ? String(view.maxHp) : "1000", main.x + 150, main.y + 46, "bold 18px Segoe UI, Microsoft YaHei", C.colors.green);
    var progress = view.maxed ? 1 : (next ? U.clamp((view.level - (next - C.wall.breakthroughStep)) / C.wall.breakthroughStep, 0, 1) : 1);
    U.roundedRect(ctx, main.x + 16, main.y + 64, main.w - 32, 8, 4, "rgba(5, 16, 23, .9)");
    U.roundedRect(ctx, main.x + 16, main.y + 64, (main.w - 32) * progress, 8, 4, C.colors.cyan);
    var progressText = view.maxed ? "已达到最高等级" : (bt.required ? "已达到 Lv." + next + " 突破节点" : "距离 Lv." + next + " 突破还差 " + Math.max(0, next - view.level) + " 级");
    text(ready ? progressText : "登录后显示城墙进度", main.x + 16, main.y + 92, "9px Segoe UI, Microsoft YaHei", bt.required ? C.colors.yellow : C.colors.muted);

    var card = ui.actionCard;
    panel(card.x, card.y, card.w, card.h, "rgba(13, 34, 46, .94)", rare ? "rgba(242, 193, 78, .44)" : "rgba(200, 214, 221, .32)", 14);
    drawMaterialIcon(material, card.x + 40, card.y + 48, 44);
    text(rare ? "稀土突破" : "钢材强化", card.x + 72, card.y + 34, "bold 14px Segoe UI, Microsoft YaHei", C.colors.text);
    var desc = !ready ? "登录后查看城墙材料" : (view.maxed ? "城墙已达到最高等级" : (rare ? "Lv." + bt.atLevel + " 突破 · 突破无属性加成" : "Lv." + view.level + " → " + (view.level + 1) + " · 血量 +" + view.hpPerLevel));
    text(desc, card.x + 72, card.y + 56, "10px Segoe UI, Microsoft YaHei", C.colors.muted);
    var hint = !ready ? "材料：钢材 + 稀土" : (view.maxed ? "钢材与稀土不再消耗" : (rare ? "突破只解锁后续等级，不增加血量" : "每次强化提高 " + view.hpPerLevel + " 防线血量"));
    text(hint, card.x + 72, card.y + 76, "9px Segoe UI, Microsoft YaHei", C.colors.muted);
    var costLabel, costColor;
    if (!ready) { costLabel = "材料数量登录后显示"; costColor = C.colors.muted; }
    else if (view.maxed) { costLabel = "已满级"; costColor = C.colors.yellow; }
    else if (rare) {
      costLabel = "稀土 " + view.rareEarth + "/" + bt.cost;
      costColor = view.rareEarth >= bt.cost ? C.colors.green : C.colors.red;
    } else {
      costLabel = "钢材 " + view.steel + "/" + view.nextSteelCost;
      costColor = view.steel >= view.nextSteelCost ? C.colors.green : C.colors.red;
    }
    materialLabel(material, costLabel, card.x + 72, card.y + 99, costColor);

    var button = Game.getWallActionButtonRect(), label, enabled = false;
    if (!ready) label = "未登录";
    else if (view.maxed) label = "已满级";
    else if (rare) {
      label = busy && state.wallAction === "breakthrough" ? "突破中…" : "突破";
      enabled = view.canBreakthrough && !busy;
    } else {
      label = busy && state.wallAction === "level" ? "强化中…" : "强化";
      enabled = view.canLevel && !busy;
    }
    var fill = "rgba(38, 56, 66, .9)";
    if (enabled) fill = rare ? (view.rareEarth >= bt.cost ? "#f2c14e" : "#d0a940") : (view.steel >= view.nextSteelCost ? C.colors.green : C.colors.yellow);
    U.roundedRect(ctx, button.x, button.y, button.w, button.h, 9, fill, enabled ? "rgba(255, 255, 255, .2)" : "rgba(153, 205, 218, .16)");
    if (ready) drawMaterialIcon(material, button.x + 22, button.y + 17, 16);
    text(label, button.x + button.w / 2 + (ready ? 8 : 0), button.y + 22, "bold 11px Segoe UI, Microsoft YaHei", enabled ? "#071217" : C.colors.muted, "center");

    var message = state.wallError || state.wallNotice || (rare ? "突破后继续用钢材强化 · 关卡奖励产出" : "材料：钢材 + 稀土 · 关卡奖励产出");
    text(String(message).slice(0, 34), center, ui.noteY, "9px Segoe UI, Microsoft YaHei", state.wallError ? C.colors.red : (state.wallNotice ? C.colors.green : C.colors.muted), "center");
    Game.button(ui.back.x, ui.back.y, ui.back.w, ui.back.h, "返回属性", "#4b7180");
  };
  function drawGemIcon(cx, cy, size, color) {
    var s = size / 2;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy - s); ctx.lineTo(cx + s * .72, cy - s * .35); ctx.lineTo(cx + s * .50, cy + s * .55);
    ctx.lineTo(cx, cy + s); ctx.lineTo(cx - s * .50, cy + s * .55); ctx.lineTo(cx - s * .72, cy - s * .35);
    ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
    ctx.lineWidth = Math.max(1, size * .05); ctx.strokeStyle = "rgba(255, 255, 255, .58)"; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - s); ctx.lineTo(cx + s * .72, cy - s * .35); ctx.lineTo(cx - s * .72, cy - s * .35); ctx.closePath();
    ctx.fillStyle = "rgba(255, 255, 255, .38)"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx - s * .72, cy - s * .35); ctx.lineTo(cx - s * .50, cy + s * .55); ctx.lineTo(cx, cy + s); ctx.lineTo(cx, cy); ctx.closePath();
    ctx.fillStyle = "rgba(255, 255, 255, .12)"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + s * .72, cy - s * .35); ctx.lineTo(cx + s * .50, cy + s * .55); ctx.lineTo(cx, cy + s); ctx.lineTo(cx, cy); ctx.closePath();
    ctx.fillStyle = "rgba(0, 0, 0, .22)"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx, cy - s * .88); ctx.lineTo(cx - s * .12, cy - s * .10);
    ctx.strokeStyle = "rgba(255, 255, 255, .48)"; ctx.lineWidth = Math.max(1, size * .045); ctx.stroke();
    ctx.restore();
  }

  function drawGemPager(rect, label, enabled, color) {
    U.roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 6, enabled ? "rgba(26, 57, 70, .96)" : "rgba(24, 40, 48, .7)", enabled ? "rgba(153, 205, 218, .32)" : "rgba(153, 205, 218, .12)");
    text(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 4, "bold 12px Segoe UI, Microsoft YaHei", enabled ? color : C.colors.muted, "center");
  }

  Game.drawGemsPanel = function () {
    var ui = C.gemUI, center = C.width / 2, state = Game.accounts.state;
    var ready = Game.accounts.getStatus() === "ready";
    var part = Game.gems.getPart(S.gemPart || "arm"), equip = Game.equipment.getSlot(part.partId);
    var page = Game.getGemPage(part.partId), pages = Game.getGemPageCount(part.partId);
    var busy = state.gemBusy;
    Game.overlay();
    panel(ui.panelX, ui.panelY, ui.panelWidth, ui.panelHeight, "rgba(10, 35, 49, .96)", "rgba(153, 205, 218, .22)", 20);
    badge("LOADOUT  ·  GEMS", 103, 70, 154, C.colors.green);
    text("宝石镶嵌", center, ui.titleY, "bold 25px Segoe UI, Microsoft YaHei", C.colors.yellow, "center");
    text("六部位 × 六槽位 · 手动一键合成", center, ui.subtitleY, "11px Segoe UI, Microsoft YaHei", C.colors.muted, "center");

    C.equipment.slots.forEach(function (slot, index) {
      var rect = Game.getGemPartTabRect(index), active = slot.id === part.partId;
      var tabPart = Game.gems.getPart(slot.id);
      U.roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 8, active ? slot.color : "rgba(13, 34, 46, .94)", active ? "rgba(255, 255, 255, .24)" : "rgba(153, 205, 218, .18)");
      text(slot.short + " " + tabPart.socketedCount, rect.x + rect.w / 2, rect.y + 18, "bold 10px Segoe UI, Microsoft YaHei", active ? "#071217" : C.colors.muted, "center");
    });

    if (ready) {
      text(part.name + " · Lv." + (equip ? equip.level : 0) + (equip && equip.elementName ? " · " + equip.elementName : ""), 44, ui.summaryY, "10px Segoe UI, Microsoft YaHei", C.colors.muted);
      text("宝石 " + part.socketedCount + " / " + part.capacity, 316, ui.summaryY, "bold 10px Segoe UI, Microsoft YaHei", part.socketedCount ? C.colors.green : C.colors.muted, "right");
    } else {
      text("登录后可管理宝石", 44, ui.summaryY, "10px Segoe UI, Microsoft YaHei", C.colors.muted);
      text("0 / 6", 316, ui.summaryY, "bold 10px Segoe UI, Microsoft YaHei", C.colors.muted, "right");
    }

    for (var socket = 0; socket < C.gems.socketsPerPart; socket++) {
      var socketRect = Game.getGemSocketRect(socket), gem = part.sockets[socket];
      if (gem) {
        U.roundedRect(ctx, socketRect.x, socketRect.y, socketRect.w, socketRect.h, 10, "rgba(13, 34, 46, .96)", gem.color);
        drawGemIcon(socketRect.x + 18, socketRect.y + 17, 18, gem.color);
        text(gem.qualityShort, socketRect.x + 32, socketRect.y + 21, "bold 9px Segoe UI, Microsoft YaHei", gem.color);
        if (gem.locked) text("🔒", socketRect.x + 78, socketRect.y + 20, "10px Segoe UI Emoji, Segoe UI, Microsoft YaHei", C.colors.yellow, "center");
        text(String(gem.affix.text).slice(0, 12), socketRect.x + 8, socketRect.y + 40, "8px Segoe UI, Microsoft YaHei", C.colors.text);
      } else {
        U.roundedRect(ctx, socketRect.x, socketRect.y, socketRect.w, socketRect.h, 10, "rgba(7, 20, 28, .62)", "rgba(153, 205, 218, .18)");
        text("+", socketRect.x + 17, socketRect.y + 24, "bold 17px Segoe UI, Microsoft YaHei", C.colors.muted, "center");
        text("空槽", socketRect.x + 8, socketRect.y + 40, "8px Segoe UI, Microsoft YaHei", C.colors.muted);
      }
    }

    text("宝石背包", 34, ui.inventoryTitleY, "bold 12px Segoe UI, Microsoft YaHei", C.colors.cyan);
    text((page + 1) + " / " + pages, 246, ui.inventoryTitleY, "9px Segoe UI, Microsoft YaHei", C.colors.muted, "right");
    drawGemPager(Game.getGemInventoryPrevRect(), "‹", page > 0, C.colors.cyan);
    drawGemPager(Game.getGemInventoryNextRect(), "›", page < pages - 1, C.colors.cyan);

    var rows = ui.inventory.rows, start = page * rows;
    for (var row = 0; row < rows; row++) {
      var rowRect = Game.getGemInventoryRowRect(row), item = part.inventory[start + row];
      U.roundedRect(ctx, rowRect.x, rowRect.y, rowRect.w, rowRect.h - 2, 7, "rgba(13, 34, 46, .86)", item ? item.color : "rgba(153, 205, 218, .10)");
      if (item) {
        drawGemIcon(rowRect.x + 14, rowRect.y + 13, 12, item.color);
        text((item.locked ? "🔒 " : "") + item.qualityName + " · " + item.affix.text, rowRect.x + 26, rowRect.y + 18, "9px Segoe UI Emoji, Segoe UI, Microsoft YaHei", C.colors.text);
        var action = !ready ? "未登录" : (!part.canSocket ? "已满" : (busy ? "处理中" : "镶嵌 ›"));
        text(action, rowRect.x + rowRect.w - 40, rowRect.y + 18, "bold 9px Segoe UI, Microsoft YaHei", part.canSocket && ready ? item.color : C.colors.muted, "right");
        var lockRect = Game.getGemInventoryLockRect(row);
        U.roundedRect(ctx, lockRect.x, lockRect.y, lockRect.w, lockRect.h, 6, item.locked ? "rgba(255, 209, 102, .18)" : "rgba(26, 57, 70, .94)", item.locked ? "rgba(255, 209, 102, .58)" : "rgba(153, 205, 218, .28)");
        text(item.locked ? "🔒" : "锁", lockRect.x + lockRect.w / 2, lockRect.y + 13, item.locked ? "10px Segoe UI Emoji, Segoe UI, Microsoft YaHei" : "bold 9px Segoe UI, Microsoft YaHei", item.locked ? C.colors.yellow : C.colors.muted, "center");
      } else if (row === 0 && part.inventory.length === 0) {
        text(ready ? "暂无未镶嵌宝石" : "登录后显示宝石背包", rowRect.x + 16, rowRect.y + 18, "9px Segoe UI, Microsoft YaHei", C.colors.muted);
      }
    }

    var synth = ui.synthesis, summary = Game.getGemSynthesisSummary();
    panel(synth.x, synth.y, synth.w, synth.h, "rgba(13, 34, 46, .94)", "rgba(201, 161, 255, .22)", 12);
    text("一键合成", synth.x + 14, synth.y + 16, "bold 10px Segoe UI, Microsoft YaHei", C.colors.text);
    text("可合成 " + summary.recipes + " 组 · 锁定 " + summary.locked + " 颗", synth.x + synth.w - 14, synth.y + 16, "9px Segoe UI, Microsoft YaHei", summary.recipes ? C.colors.green : C.colors.muted, "right");
    var synthLabel = !ready ? "未登录" : (busy && state.gemAction === "synthesize" ? "合成中…" : (summary.recipes ? "一键合成" : "暂无可合成"));
    var synthEnabled = ready && !busy && summary.recipes > 0;
    var button = Game.getGemSynthesisButtonRect();
    U.roundedRect(ctx, button.x, button.y, button.w, button.h, 8, synthEnabled ? C.colors.green : "rgba(38, 56, 66, .9)", synthEnabled ? "rgba(255, 255, 255, .28)" : "rgba(153, 205, 218, .16)");
    text(synthLabel, button.x + button.w / 2, button.y + 20, "bold 11px Segoe UI, Microsoft YaHei", synthEnabled ? "#071217" : C.colors.muted, "center");

    var message = state.gemError || state.gemNotice || "锁定与已镶嵌宝石不参与合成 · 合成前会确认";
    text(String(message).slice(0, 36), center, ui.noteY, "9px Segoe UI, Microsoft YaHei", state.gemError ? C.colors.red : (state.gemNotice ? C.colors.green : C.colors.muted), "center");
    Game.button(ui.back.x, ui.back.y, ui.back.w, ui.back.h, "返回属性", "#4b7180");
    if (S.gemSynthesisOpen) Game.drawGemSynthesis();
  };

  Game.drawGemSynthesis = function () {
    var ui = C.gemSynthesisUI, center = C.width / 2, state = Game.accounts.state;
    var ready = Game.accounts.getStatus() === "ready", busy = state.gemBusy;
    var plan = Game.getGemSynthesisPlan(), page = Game.getGemSynthesisPage();
    var pages = Game.getGemSynthesisPageCount(), focus = Game.gems.findGem(S.gemSynthesisFocus);
    U.roundedRect(ctx, 0, 0, C.width, C.height, 0, "rgba(3, 9, 13, .78)");
    panel(ui.panelX, ui.panelY, ui.panelWidth, ui.panelHeight, "rgba(10, 35, 49, .98)", "rgba(153, 205, 218, .24)", 20);
    badge("SYNTHESIS  ·  GEMS", center - 77, ui.panelY + 14, 154, C.colors.purple);
    text("一键合成", center, ui.titleY, "bold 24px Segoe UI, Microsoft YaHei", C.colors.yellow, "center");
    text(plan.length ? "共 " + plan.length + " 组 · 确认后全部合成" : "当前没有可合成的宝石", center, ui.subtitleY, "10px Segoe UI, Microsoft YaHei", C.colors.muted, "center");

    if (!plan.length) {
      text("锁定或已镶嵌的宝石不会参与合成", center, 250, "10px Segoe UI, Microsoft YaHei", C.colors.muted, "center");
    }
    var rows = ui.rows, start = page * rows;
    for (var row = 0; row < rows; row++) {
      var recipe = plan[start + row], rect = Game.getGemSynthesisRowRect(row);
      if (!recipe) continue;
      U.roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 9, "rgba(13, 34, 46, .94)", recipe.color);
      text(recipe.partShort + " · " + recipe.qualityShort, rect.x + 8, rect.y + 20, "bold 10px Segoe UI, Microsoft YaHei", recipe.partColor);
      for (var gemIndex = 0; gemIndex < recipe.gems.length; gemIndex++) {
        var gem = recipe.gems[gemIndex], gemRect = Game.getGemSynthesisGemRect(row, gemIndex);
        drawGemIcon(gemRect.x + gemRect.w / 2, gemRect.y + gemRect.h / 2, ui.gemSize, gem.color);
        if (focus && focus.id === gem.id) U.roundedRect(ctx, gemRect.x, gemRect.y, gemRect.w, gemRect.h, 5, null, C.colors.yellow);
      }
      text("→ " + recipe.resultShort, rect.x + 166, rect.y + 21, "bold 11px Segoe UI, Microsoft YaHei", recipe.resultColor);
      text("5 颗" + recipe.qualityName + " → 1 颗" + recipe.resultName, rect.x + 8, rect.y + 40, "9px Segoe UI, Microsoft YaHei", C.colors.muted);
    }
    drawGemPager(Game.getGemSynthesisPrevRect(), "‹", page > 0, C.colors.cyan);
    drawGemPager(Game.getGemSynthesisNextRect(), "›", page < pages - 1, C.colors.cyan);
    text((page + 1) + " / " + pages, 190, ui.pagerNext.y + 15, "9px Segoe UI, Microsoft YaHei", C.colors.muted, "right");

    text("词条预览", ui.listX, ui.detailY, "bold 9px Segoe UI, Microsoft YaHei", C.colors.cyan);
    if (focus) text(focus.qualityName + " · " + focus.affix.text, ui.listX, ui.detailSubY, "bold 11px Segoe UI, Microsoft YaHei", focus.color);
    else text("点击任意宝石查看词条", ui.listX, ui.detailSubY, "10px Segoe UI, Microsoft YaHei", C.colors.muted);

    var confirm = Game.getGemSynthesisConfirmRect(), cancel = Game.getGemSynthesisCancelRect();
    var enabled = ready && !busy && plan.length > 0;
    U.roundedRect(ctx, confirm.x, confirm.y, confirm.w, confirm.h, 8, enabled ? C.colors.green : "rgba(38, 56, 66, .9)", enabled ? "rgba(255, 255, 255, .28)" : "rgba(153, 205, 218, .16)");
    text(busy && state.gemAction === "synthesize" ? "合成中…" : "确定", confirm.x + confirm.w / 2, confirm.y + 20, "bold 11px Segoe UI, Microsoft YaHei", enabled ? "#071217" : C.colors.muted, "center");
    U.roundedRect(ctx, cancel.x, cancel.y, cancel.w, cancel.h, 8, "rgba(38, 56, 66, .9)", "rgba(153, 205, 218, .24)");
    text("取消", cancel.x + cancel.w / 2, cancel.y + 20, "bold 11px Segoe UI, Microsoft YaHei", C.colors.text, "center");
    if (state.gemError) text(String(state.gemError).slice(0, 30), center, ui.panelY + ui.panelHeight - 10, "9px Segoe UI, Microsoft YaHei", C.colors.red, "center");
  };

  function dot(x, y, radius, fill, stroke) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.lineWidth = 1.2; ctx.strokeStyle = stroke; ctx.stroke(); }
  }
  function drawLevelInfoButton(index, unlocked) {
    var rect = Game.getLevelInfoRect(index), cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
    dot(cx, cy, rect.w / 2, "rgba(13, 34, 46, .92)", unlocked ? "rgba(104, 216, 255, .5)" : "rgba(153, 205, 218, .22)");
    text("?", cx, cy + 5, "bold 13px Segoe UI, Microsoft YaHei", unlocked ? C.colors.cyan : "#667985", "center");
  }
  Game.drawLevelBrief = function () {
    var level = C.levels.filter(function (item) { return item.id === S.levelPreview; })[0];
    if (!level) return;
    var layout = Game.getLevelBriefLayout(), box = layout.box, close = Game.getLevelBriefCloseRect();
    var left = box.x + 20, right = box.x + box.w - 20;
    var titles = ["小怪", "精英", "首领"], colors = [C.colors.green, C.colors.yellow, C.colors.red];
    U.roundedRect(ctx, 0, 0, C.width, C.height, 0, "rgba(3, 9, 13, .78)");
    panel(box.x, box.y, box.w, box.h, "rgba(10, 35, 49, .98)", "rgba(153, 205, 218, .24)", 20);
    badge("MISSION BRIEF", C.width / 2 - 75, box.y + 14, 150, C.colors.cyan);
    U.roundedRect(ctx, close.x, close.y, close.w, close.h, 9, "rgba(16, 41, 54, .96)", "rgba(153, 205, 218, .24)");
    text("×", close.x + close.w / 2, close.y + close.h / 2 + 5, "bold 15px Segoe UI, Microsoft YaHei", C.colors.muted, "center");
    text((level.id < 10 ? "0" + level.id : "" + level.id) + "  " + level.name, C.width / 2, box.y + 64, "bold 21px Segoe UI, Microsoft YaHei", C.colors.yellow, "center");
    text(level.subtitle, C.width / 2, box.y + 86, "11px Segoe UI, Microsoft YaHei", C.colors.muted, "center");
    U.roundedRect(ctx, left, box.y + 100, right - left, 1, .5, "rgba(153, 205, 218, .16)");
    text("关卡简介", left, box.y + 122, "bold 12px Segoe UI, Microsoft YaHei", C.colors.cyan);
    ctx.fillStyle = C.colors.text;
    ctx.font = "12px Segoe UI, Microsoft YaHei";
    ctx.textAlign = "left";
    U.wrapText(ctx, level.brief || level.subtitle, left, box.y + 142, right - left, 16);
    layout.groups.forEach(function (group, index) {
      text(titles[index], left, box.y + group.y, "bold 12px Segoe UI, Microsoft YaHei", colors[index]);
      if (!group.rows.length) { text("—", left + 6, box.y + group.y + 20, "12px Segoe UI, Microsoft YaHei", C.colors.muted); return; }
      group.rows.forEach(function (item) {
        dot(left + 6, box.y + item.y - 4, 6, item.entry.color, item.entry.accent);
        text(item.entry.name, left + 20, box.y + item.y, "bold 13px Segoe UI, Microsoft YaHei", C.colors.text);
        text(item.entry.waves.length > 1 ? "第 " + item.entry.wave + " 波起 · 覆盖 " + item.entry.waves.length + " 波" : "第 " + item.entry.wave + " 波", right, box.y + item.y, "10px Segoe UI, Microsoft YaHei", C.colors.muted, "right");
      });
    });
  };
  Game.drawLevelSelect = function () {
    var geo = C.levelSelect, rowHeight = Game.getLevelRowRect(0).h;
    Game.overlay();
    panel(geo.panelX, geo.panelY, geo.panelWidth, geo.panelHeight, "rgba(10, 35, 49, .94)", "rgba(153, 205, 218, .18)", 20);
    badge("MISSION SELECT", 105, 68, 150, C.colors.cyan);
    text("选择关卡", C.width / 2, 112, "bold 25px Segoe UI, Microsoft YaHei", C.colors.yellow, "center");
    text("所有关卡已开放 · 点击行开战，点 ? 看详情", C.width / 2, 135, "12px Segoe UI, Microsoft YaHei", C.colors.muted, "center");
    U.roundedRect(ctx, geo.listX, geo.listY, geo.listWidth, rowHeight * C.levels.length, 14, "rgba(13, 34, 46, .92)", "rgba(153, 205, 218, .16)");
    C.levels.forEach(function (level, index) {
      var r = Game.getLevelRowRect(index), cy = r.y + r.h / 2;
      var unlocked = Game.isLevelUnlocked(level.id), completed = Game.isLevelCompleted(level.id);
      if (completed) U.roundedRect(ctx, r.x + 2, r.y + 8, 4, r.h - 16, 2, C.colors.green);
      text(level.id < 10 ? "0" + level.id : "" + level.id, r.x + 26, cy + 7, "bold 19px Segoe UI, Microsoft YaHei", unlocked ? (completed ? C.colors.green : C.colors.cyan) : "#667985", "center");
      text(level.name, r.x + 54, cy + 5, "bold 15px Segoe UI, Microsoft YaHei", unlocked ? C.colors.text : "#71828b");
      drawLevelInfoButton(index, unlocked);
      if (!unlocked) text("未解锁", r.x + r.w - 16, cy + 4, "bold 11px Segoe UI, Microsoft YaHei", "#7e8d94", "right");
      else if (completed) text("已通关", r.x + r.w - 16, cy + 4, "bold 11px Segoe UI, Microsoft YaHei", C.colors.green, "right");
      else text("›", r.x + r.w - 18, cy + 7, "bold 20px Segoe UI, Microsoft YaHei", C.colors.cyan, "center");
      if (index < C.levels.length - 1) U.roundedRect(ctx, r.x + 16, r.y + r.h - .5, r.w - 32, 1, .5, "rgba(153, 205, 218, .14)");
    });
    Game.button(C.width / 2 - 72, geo.backY, 144, geo.backHeight, "返回首页", "#4b7180");
    if (S.levelPreview) Game.drawLevelBrief();
  };
  function drawCodexTab(x, y, w, label, active, color) {
    U.roundedRect(ctx, x, y, w, 31, 10, active ? "rgba(49, 105, 125, .95)" : "rgba(13, 29, 39, .9)", active ? color : "rgba(153,205,218,.18)");
    text(label, x + w / 2, y + 20, "bold 11px Segoe UI, Microsoft YaHei", active ? C.colors.text : C.colors.muted, "center");
  }
  function drawCodexPager(page, totalPages) {
    if (totalPages > 1) {
      Game.button(94, 521, 54, 31, "‹", C.colors.cyan);
      text((page + 1) + " / " + totalPages, C.width / 2, 542, "bold 11px Segoe UI, Microsoft YaHei", C.colors.text, "center");
      Game.button(212, 521, 54, 31, "›", C.colors.cyan);
    }
    Game.button(C.width / 2 - 72, 561, 144, 36, "返回首页", "#4b7180");
  }
  Game.drawZombieCodex = function () {
    Game.overlay();
    panel(14, 36, C.width - 28, 568, "rgba(10, 35, 49, .97)", "rgba(153, 205, 218, .22)", 20);
    badge("FIELD GUIDE  ·  ENEMIES", 91, 50, 178, C.colors.cyan);
    text("僵尸图鉴", C.width / 2, 95, "bold 23px Segoe UI, Microsoft YaHei", C.colors.yellow, "center");
    var categories = [{ id: "minion", label: "小怪", color: C.colors.green }, { id: "elite", label: "精英", color: C.colors.yellow }, { id: "boss", label: "首领", color: C.colors.red }];
    categories.forEach(function (category, index) { drawCodexTab(22 + index * 106, 107, 102, category.label, S.zombieCodexCategory === category.id, category.color); });
    var selected = categories.find(function (category) { return category.id === S.zombieCodexCategory; }) || categories[0];
    var entryIds = Game.getCodexEnemyIds(selected.id);
    var pages = Math.max(1, Math.ceil(entryIds.length / 4)), page = U.clamp(S.codexPage || 0, 0, pages - 1);
    S.codexPage = page;
    var selectedEnemy = S.selectedZombieCodexId ? C.enemies[S.selectedZombieCodexId] : null;
    if (selectedEnemy && (selectedEnemy.codexCategory || "minion") === selected.id) {
      panel(26, 148, 308, 400, "rgba(17, 47, 62, .94)", "rgba(104,216,255,.22)", 16);
      drawCodexEnemyModel(S.selectedZombieCodexId, selectedEnemy, 40, 153, 280, 152, true);
      text(selectedEnemy.name, C.width / 2, 330, "bold 20px Segoe UI, Microsoft YaHei", C.colors.text, "center");
      text("生命 " + selectedEnemy.hp + "   ·   移速 " + selectedEnemy.speed + " / 秒", 44, 353, "bold 11px Segoe UI, Microsoft YaHei", C.colors.cyan);
      var rangedInfo = selectedEnemy.ranged, rangedAction = rangedInfo ? (rangedInfo.action || "投掷") : "";
      text((rangedInfo ? rangedAction + "伤害 " + rangedInfo.damage : "城墙伤害 " + selectedEnemy.damage) + "   ·   击杀经验 " + selectedEnemy.xp + "   ·   半径 " + selectedEnemy.radius, 44, 374, "bold 10px Segoe UI, Microsoft YaHei", C.colors.cyan);
      if (rangedInfo) text((selectedEnemy.flying ? "远程飞行单位" : "远程单位") + "   ·   每 " + rangedInfo.interval + " 秒" + rangedAction + "一次，距防线 " + rangedInfo.standoff + " 像素" + (selectedEnemy.flying ? "处悬停" : "处停下"), 44, 392, "bold 10px Segoe UI, Microsoft YaHei", C.colors.purple);
      else if (selectedEnemy.flying) text("飞行单位   ·   免疫装甲车、龙卷风与燃油弹等贴地技能", 44, 392, "bold 10px Segoe UI, Microsoft YaHei", C.colors.purple);
      else if (selectedEnemy.armorCharges) text("装甲 " + selectedEnemy.armorCharges + " 层   ·   可抵挡等量的伤害与负面状态", 44, 392, "bold 10px Segoe UI, Microsoft YaHei", C.colors.purple);
      else if (selectedEnemy.regenPerSecond) text("生命回复 " + selectedEnemy.regenPerSecond + " 点 / 秒" + (selectedEnemy.regenBelowHpRatio ? "   ·   仅在生命低于 " + Math.round(selectedEnemy.regenBelowHpRatio * 100) + "% 时生效" : "   ·   持续生效，受重伤压制"), 44, 392, "bold 10px Segoe UI, Microsoft YaHei", C.colors.purple);
      text("单位特征", 44, 404, "bold 11px Segoe UI, Microsoft YaHei", C.colors.yellow);
      ctx.font = "11px Segoe UI, Microsoft YaHei"; ctx.fillStyle = C.colors.text; ctx.textAlign = "left";
      U.wrapText(ctx, selectedEnemy.description || "详细资料待补充。", 44, 422, 272, 13);
      text("应对建议", 44, 465, "bold 11px Segoe UI, Microsoft YaHei", C.colors.yellow);
      ctx.font = "10px Segoe UI, Microsoft YaHei"; ctx.fillStyle = C.colors.muted; ctx.textAlign = "left";
      U.wrapText(ctx, selectedEnemy.tactics || "暂无应对建议。", 44, 482, 272, 12);
      var traitY = drawCodexTraitRow("属性克制", enemyElementTraits(selectedEnemy), 516);
      drawCodexTraitRow("状态抗性", enemyStatusTraits(selectedEnemy), traitY);
      Game.button(C.width / 2 - 82, 558, 164, 38, "返回图鉴列表", C.colors.cyan);
      return;
    }
    entryIds.slice(page * 4, page * 4 + 4).forEach(function (id, index) {
      var x = 26 + (index % 2) * 160, y = 155 + Math.floor(index / 2) * 160;
      panel(x, y, 148, 148, "rgba(17, 47, 62, .94)", "rgba(104,216,255,.3)", 16);
      drawCodexEnemyModel(id, C.enemies[id], x + 5, y + 5, 138, 112, false);
      text(C.enemies[id].name, x + 74, y + 136, "bold 13px Segoe UI, Microsoft YaHei", C.colors.text, "center");
    });
    if (!entryIds.length) text("该类别暂无收录单位。", C.width / 2, 300, "13px Segoe UI, Microsoft YaHei", C.colors.muted, "center");
    drawCodexPager(page, pages);
  };
  function skillGroupColor(group) { return group.id === "rifle" ? C.colors.cyan : C.colors.purple; }
  function skillGroupElement(group) {
    var info = group && group.element ? (C.elements || {})[group.element] : null;
    if (!info) return null;
    return { name: info.name + "属性", color: info.color, note: group.elementNote || info.detail || "" };
  }
  function enemyElementTraits(enemy) {
    var table = enemy && enemy.damageTakenByElement, labels = [];
    Object.keys(table || {}).forEach(function (id) {
      var info = (C.elements || {})[id], scale = table[id];
      if (!info) return;
      labels.push({ text: info.name + "系伤害 " + (scale === 0 ? "免疫" : (scale > 1 ? "+" : "−") + Math.round(Math.abs(scale - 1) * 100) + "%"), color: info.color });
    });
    return labels;
  }
  function enemyStatusTraits(enemy) {
    var labels = [], immune = enemy && enemy.statusImmune, scales = enemy && enemy.statusDurationScale;
    Object.keys(C.statusEffects || {}).forEach(function (id) {
      var info = C.statusEffects[id], category = (C.statusCategories || {})[info.category], prefix = category ? category.name + "·" : "", scale = scales ? scales[id] : undefined;
      if (immune && immune[id]) labels.push({ text: prefix + "免疫" + info.name, color: info.color });
      else if (scale !== undefined && scale !== null && scale !== 1) labels.push({ text: prefix + (info.scaleLabel || info.name + "时间") + " " + (scale > 1 ? "+" : "−") + Math.round(Math.abs(scale - 1) * 100) + "%", color: info.color });
    });
    return labels;
  }
  function drawCodexTraitRow(label, items, y) {
    if (!items.length) return y;
    text(label, 44, y, "bold 10px Segoe UI, Microsoft YaHei", C.colors.yellow);
    var x = 96, line = y;
    items.forEach(function (item) {
      ctx.font = "bold 10px Segoe UI, Microsoft YaHei";
      var width = ctx.measureText(item.text).width;
      if (x > 96 && x + width > 334) { line += 12; x = 44; }
      text(item.text, x, line, "bold 10px Segoe UI, Microsoft YaHei", item.color);
      x += width + 12;
    });
    return line + 12;
  }
  Game.drawSkillCodex = function () {
    Game.overlay();
    panel(14, 36, C.width - 28, 568, "rgba(10, 35, 49, .97)", "rgba(153, 205, 218, .22)", 20);
    badge("FIELD GUIDE  ·  SKILLS", 91, 50, 178, C.colors.purple);
    text("技能图鉴", C.width / 2, 95, "bold 23px Segoe UI, Microsoft YaHei", C.colors.yellow, "center");
    var groups = Game.getSkillGroups();
    var selected = S.selectedSkillCodexId ? groups.find(function (group) { return group.id === S.selectedSkillCodexId; }) : null;
    if (selected) { drawSkillGroupDetail(selected); return; }
    text("选择技能查看介绍与专属词条 · 每局最多装备 " + C.maxSkillSlots + " 个", C.width / 2, 126, "11px Segoe UI, Microsoft YaHei", C.colors.muted, "center");
    var perPage = 5, pages = Math.max(1, Math.ceil(groups.length / perPage)), page = U.clamp(S.codexPage || 0, 0, pages - 1);
    S.codexPage = page;
    groups.slice(page * perPage, page * perPage + perPage).forEach(function (group, index) {
      var x = 26, y = 146 + index * 70, color = skillGroupColor(group), implemented = !group.status || group.status === "已实装";
      panel(x, y, 308, 62, "rgba(17, 47, 62, .94)", "rgba(153,205,218,.24)", 14);
      text(group.icon, x + 28, y + 39, "bold 20px Segoe UI, Microsoft YaHei", color, "center");
      text(group.name, x + 54, y + 27, "bold 14px Segoe UI, Microsoft YaHei", C.colors.text);
      text(group.traits.length + " 个词条", x + 54, y + 47, "10px Segoe UI, Microsoft YaHei", C.colors.muted);
      var element = skillGroupElement(group);
      if (element) text(element.name, x + 128, y + 47, "bold 10px Segoe UI, Microsoft YaHei", element.color, "left");
      text(group.status || "", x + 322, y + 27, "bold 10px Segoe UI, Microsoft YaHei", implemented ? C.colors.green : C.colors.yellow, "right");
      text("查看详情 ›", x + 322, y + 47, "10px Segoe UI, Microsoft YaHei", color, "right");
    });
    if (!groups.length) text("暂无技能收录。", C.width / 2, 300, "13px Segoe UI, Microsoft YaHei", C.colors.muted, "center");
    drawCodexPager(page, pages);
  };
  function drawSkillGroupDetail(group) {
    var color = skillGroupColor(group), implemented = !group.status || group.status === "已实装";
    panel(24, 130, 312, 112, "rgba(17, 47, 62, .94)", "rgba(153,205,218,.28)", 16);
    text(group.icon, 52, 182, "bold 27px Segoe UI, Microsoft YaHei", color, "center");
    text(group.name, 82, 160, "bold 17px Segoe UI, Microsoft YaHei", C.colors.text);
    text(group.status || "", 320, 160, "bold 10px Segoe UI, Microsoft YaHei", implemented ? C.colors.green : C.colors.yellow, "right");
    ctx.font = "10px Segoe UI, Microsoft YaHei"; ctx.fillStyle = C.colors.muted; ctx.textAlign = "left";
    U.wrapText(ctx, group.detail || "技能说明待补充。", 82, 182, 238, 13);
    var element = skillGroupElement(group);
    if (element) {
      var elementWidth = 22 + element.name.length * 11;
      badge(element.name, 40, 216, elementWidth, element.color);
      text(element.note, 48 + elementWidth, 230, "10px Segoe UI, Microsoft YaHei", C.colors.muted);
    }
    text("专属词条", 40, 268, "bold 13px Segoe UI, Microsoft YaHei", C.colors.yellow);
    var traits = group.traits || [], perPage = 3, pages = Math.max(1, Math.ceil(traits.length / perPage)), page = U.clamp(S.codexPage || 0, 0, pages - 1);
    S.codexPage = page;
    traits.slice(page * perPage, page * perPage + perPage).forEach(function (trait, index) {
      var x = 26, y = 282 + index * 76, rare = trait.rarity === "稀有" || trait.rarity === "史诗";
      panel(x, y, 308, 68, rare ? "#263352" : "#163b4d", rare ? "rgba(201,161,255,.34)" : "rgba(104,216,255,.24)", 12);
      text(trait.icon, x + 24, y + 32, "bold 18px Segoe UI, Microsoft YaHei", rare ? C.colors.purple : C.colors.cyan, "center");
      text(trait.name, x + 46, y + 24, "bold 13px Segoe UI, Microsoft YaHei", C.colors.text);
      text(trait.rarity + " · 最高 Lv." + trait.max, x + 294, y + 22, "bold 9px Segoe UI, Microsoft YaHei", rare ? C.colors.purple : C.colors.green, "right");
      ctx.font = "10px Segoe UI, Microsoft YaHei"; ctx.fillStyle = C.colors.muted; ctx.textAlign = "left";
      U.wrapText(ctx, trait.desc || trait.detail || "", x + 46, y + 44, 244, 12);
    });
    if (!traits.length) text("该技能暂无专属词条。", C.width / 2, 336, "12px Segoe UI, Microsoft YaHei", C.colors.muted, "center");
    if (pages > 1) { Game.button(94, 521, 54, 31, "‹", color); text((page + 1) + " / " + pages, C.width / 2, 542, "bold 11px Segoe UI, Microsoft YaHei", C.colors.text, "center"); Game.button(212, 521, 54, 31, "›", color); }
    Game.button(C.width / 2 - 82, 561, 164, 36, "返回技能列表", color);
  }
  Game.drawUpgrade = function () { Game.overlay(); panel(16, 76, C.width - 32, 414, "rgba(10, 35, 49, .94)", "rgba(153, 205, 218, .18)", 20); text("等级提升！", C.width / 2, 119, "bold 25px Segoe UI, Microsoft YaHei", C.colors.yellow, "center"); text("选择一项强化，战斗将继续", C.width / 2, 143, "12px Segoe UI, Microsoft YaHei", C.colors.text, "center"); var cardW = 98, gap = 8, start = (C.width - cardW * 3 - gap * 2) / 2; S.upgradeCards.forEach(function (trait, i) { var x = start + i * (cardW + gap), y = 190, level = S.player.traits[trait.id] || 0, rare = trait.rarity === "稀有"; panel(x, y, cardW, 218, rare ? "#263352" : "#163b4d", rare ? "rgba(201,161,255,.45)" : "rgba(104,216,255,.28)", 14); text(trait.icon, x + cardW / 2, y + 50, "bold 31px Segoe UI, Microsoft YaHei", rare ? C.colors.purple : C.colors.cyan, "center"); text(trait.name, x + cardW / 2, y + 82, "bold 14px Segoe UI, Microsoft YaHei", C.colors.text, "center"); text(trait.rarity + " · Lv." + (level + 1) + "/" + trait.max, x + cardW / 2, y + 104, "bold 11px Segoe UI, Microsoft YaHei", rare ? C.colors.purple : C.colors.green, "center"); ctx.fillStyle = C.colors.muted; ctx.font = "11px Segoe UI, Microsoft YaHei"; ctx.textAlign = "center"; U.wrapText(ctx, trait.desc, x + cardW / 2, y + 135, 78, 16); U.roundedRect(ctx, x + 17, y + 181, 64, 27, 8, "#245f73"); text("选择", x + cardW / 2, y + 199, "bold 11px Segoe UI, Microsoft YaHei", C.colors.text, "center"); }); };
  function rewardSlotName(slotId) {
    var slot = (C.equipment.slots || []).filter(function (item) { return item.id === slotId; })[0];
    return slot ? slot.name : slotId;
  }
  function rewardElementName(elementId) {
    return C.elements[elementId] ? C.elements[elementId].name : elementId;
  }
  function rewardRows(reward) {
    var rows = [], resources = reward.resources || {}, steel = resources.steel || 0, rare = resources.rareEarth || 0, blueprints = 0;
    if (resources.coin) rows.push({ text: "金币 +" + resources.coin, color: C.colors.yellow });
    if (steel || rare) rows.push({ text: "钢材 +" + steel + (rare ? " · 稀土 +" + rare : ""), color: "#c8d6dd" });
    (C.resources || []).forEach(function (item) { if (item.id.indexOf("blueprint") === 0) blueprints += resources[item.id] || 0; });
    if (blueprints) rows.push({ text: "装备图纸 +" + blueprints + "（随机部位）", color: C.colors.cyan });
    var gems = reward.gems || [];
    if (gems.length) {
      var counts = [0, 0, 0, 0, 0], labels = [];
      gems.forEach(function (gem) { counts[U.clamp(Math.round(gem.quality || 0), 0, 4)] += 1; });
      (C.gems.qualities || []).forEach(function (quality) { if (counts[quality.id]) labels.push(quality.short + " " + counts[quality.id]); });
      rows.push({ text: "宝石 +" + gems.length + "（" + labels.join(" · ") + "）", color: C.colors.purple });
    }
    var equipment = reward.equipment || [];
    if (equipment.length) {
      var names = equipment.map(function (item) { return rewardSlotName(item.slotId) + "·" + rewardElementName(item.element); });
      rows.push({ text: "装备 +" + equipment.length + "（" + names.join("、") + "）", color: C.colors.green });
    }
    return rows;
  }
  Game.drawResult = function () {
    Game.overlay();
    var ui = C.resultUI, win = S.screen === "victory", retreat = S.screen === "retreat", session = S.session, accountState = Game.accounts.state;
    panel(ui.panelX, ui.panelY, ui.panelWidth, ui.panelHeight, "rgba(10, 35, 49, .94)", "rgba(153, 205, 218, .18)", 20);
    text(win ? "关卡胜利" : (retreat ? "撤离战场" : "战斗失败"), C.width / 2, ui.titleY, "bold 30px Segoe UI, Microsoft YaHei", win ? C.colors.green : (retreat ? C.colors.cyan : C.colors.red), "center");
    text(win ? "尸潮已被肃清" : (retreat ? "已带着战利品撤离" : "尸潮突破了防线"), C.width / 2, ui.subtitleY, "14px Segoe UI, Microsoft YaHei", C.colors.text, "center");
    text("用时 " + U.formatTime(session.elapsed) + "  ·  击杀 " + session.kills + "  ·  等级 " + S.player.level, C.width / 2, ui.statsY, "13px Segoe UI, Microsoft YaHei", C.colors.muted, "center");
    var reward = session.reward, rows = reward ? rewardRows(reward) : [], tier = reward ? C.rewardTiers[reward.tier] : null;
    text("本局奖励", ui.panelX + 18, ui.rewardTitleY, "bold 12px Segoe UI, Microsoft YaHei", C.colors.cyan);
    if (tier) text(tier.name, ui.panelX + ui.panelWidth - 18, ui.rewardTitleY, "bold 11px Segoe UI, Microsoft YaHei", C.colors.yellow, "right");
    if (!reward || reward.status === "pending") {
      text("正在结算…", C.width / 2, ui.rewardRowY + 6, "11px Segoe UI, Microsoft YaHei", C.colors.muted, "center");
    } else if (reward.status === "unsaved" || reward.status === "failed") {
      text(String(reward.note || (reward.status === "unsaved" ? "未登录 · 奖励不会保存" : "奖励领取失败")).slice(0, 30), C.width / 2, ui.rewardRowY + 6, "11px Segoe UI, Microsoft YaHei", reward.status === "unsaved" ? C.colors.yellow : C.colors.red, "center");
    } else {
      rows.forEach(function (row, index) {
        var y = ui.rewardRowY + index * ui.rewardRowStep;
        dot(ui.panelX + 22, y - 3, 3, row.color);
        text(row.text, ui.panelX + 32, y, "12px Segoe UI, Microsoft YaHei", row.color);
      });
    }
    if (win) {
      var next = C.levels.find(function (item) { return item.id === session.level + 1; });
      text(next ? "已解锁：" + next.name : "已通关全部开放关卡", C.width / 2, ui.nextLevelY, "12px Segoe UI, Microsoft YaHei", C.colors.green, "center");
    }
    var hint = "成绩未保存", hintColor = C.colors.muted;
    if (retreat) hint = "中途撤离 · 本局不计入成绩";
    else if (session.testArena) hint = "测试场不记录成绩";
    else if (accountState.lastReportSaved) { hint = "成绩已保存到账户 · " + Game.accounts.getUsername(); hintColor = C.colors.green; }
    else hint = "成绩未保存 · " + (accountState.lastReportReason || Game.accounts.getStatusNote() || "未登录");
    text(hint, C.width / 2, ui.progressHintY, "11px Segoe UI, Microsoft YaHei", hintColor, "center");
    if (reward && reward.status === "done") text("奖励已存入账户 · " + Game.accounts.getUsername(), C.width / 2, ui.rewardHintY, "11px Segoe UI, Microsoft YaHei", C.colors.green, "center");
    Game.button(ui.restart.x, ui.restart.y, ui.restart.w, ui.restart.h, "重新开始", win ? C.colors.green : C.colors.yellow);
    Game.button(ui.back.x, ui.back.y, ui.back.w, ui.back.h, "返回首页", "#4b7180");
  };
})(window.Game = window.Game || {});
