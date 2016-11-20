try {
    var gn = new GyroNorm({screenAdjusted: true});
    var rotateListener = null;
    var accelerationListener = null;
    gn.init({
        frequency: 50
    }).then(function () {
        gn.start(function (data) {
            if (rotateListener) rotateListener(data.do.alpha);
            if (accelerationListener) accelerationListener(data.dm);
        });
    }).catch(function (e) {
        alert(e);
    });

    var Screen = {
        initSplash: function () {
            var $screen = $('.screen-splash');
            $screen.click(function () {
                screen.visibleRect.show();
                requestFullScreen();
            });
            return initScreen($screen);
        },
        initVisibleRect: function () {
            var $screen = $('.screen-visible-rect');
            var $visibleRect = $('.visible-rect');
            var $set = $visibleRect.find('#set');
            $(window).resize(function () {
                $set.css('margin-top', ($visibleRect.innerHeight() - $set.outerHeight()) / 2);
            });
            $set.click(function () {
                screen.zeroPoint.show();
            });
            return initScreen($screen, function () {
                var moving = false;
                var initialPoint = null;
                var x0, y0;
                $(window).on('touchstart', function (e) {
                    initialPoint = null;
                    moving = true;
                });
                $(window).on('touchmove', function (e) {
                    if (!moving) return;
                    var touches = e.originalEvent.touches[0];
                    if (!initialPoint) {
                        x0 = touches.pageX;
                        y0 = touches.pageY;
                        initialPoint = touches;
                    }
                    var sx = x0, sy = y0, ex = touches.pageX, ey = touches.pageY;
                    var tmp;
                    if (sx > ex) {
                        tmp = sx;
                        sx = ex;
                        ex = tmp;
                    }
                    if (sy > ey) {
                        tmp = sy;
                        sy = ey;
                        ey = tmp;
                    }
                    $visibleRect.css('left', sx);
                    $visibleRect.css('top', sy);
                    $visibleRect.css('right', $(document).width() - ex);
                    $visibleRect.css('bottom', $(document).height() - ey);
                    $set.css('margin-top', ($visibleRect.innerHeight() - $set.outerHeight()) / 2);
                });
                $(window).on('touchend', function (e) {
                    moving = false;
                });
            }, function () {
                $(window).off('touchstart');
                $(window).off('touchmove');
                $(window).off('touchend');
            });
        },
        initZeroPoint: function () {
            var $screen = $('.screen-zero-point');
            var $zeroTimeLeft = $('#zero-time-left');
            return initScreen($screen, function () {
                var prevAngle, prevTime = 0;
                rotateListener = function (angle) {
                    if (angle > 180) angle -= 360;
                    var time = Date.now();
                    var timeDiff = time - prevTime;
                    $zeroTimeLeft.text('Put the case on the floor for ' + Math.ceil(Math.min(3000 - timeDiff, 3000) / 1000) + ' seconds.');
                    if (Math.abs(angle - prevAngle) < 1) {
                        if (timeDiff > 3000) {
                            screen.instruction.show(angle);
                        }
                    } else {
                        prevTime = time;
                        prevAngle = angle;
                    }
                };
            }, function () {
                rotateListener = null;
            });
        },
        initInstruction: function () {
            var $screen = $('.screen-instruction');
            var $msg = $screen.find('.msg');
            var $next = $screen.find('.next');
            return initScreen($screen, function (angle) {
                var msgs = ['Ask the patient to bend forward until the shoulders are leveled with the hips.',
                    'Put the case on the upper spine right below the neck.'];
                var i = 0;
                $next.click(function () {
                    if (i < msgs.length) {
                        $msg.text(msgs[i++]);
                    } else {
                        screen.protractor.show(angle);
                    }
                });
                $next.click();
            });
        },
        initProtractor: function () {
            var $screen = $('.screen-protractor');
            var $visibleRect = $screen.find('.visible-rect');
            var zeroAngle = null;
            var $angle = $('#angle');
            var $msg = $screen.find('.msg');
            var $tube = $('#tube');
            var $ball = $('#ball');
            return initScreen($screen, function (angle) {
                zeroAngle = angle;
                var mode = 0;
                var angles = [];
                var lastAngle = null;
                var size = Math.min($visibleRect.innerWidth(), $visibleRect.innerHeight());
                $tube.css({
                    width: size,
                    height: size,
                    marginLeft: ($visibleRect.innerWidth() - size) / 2,
                    marginTop: ($visibleRect.innerHeight() - size) / 2
                });
                $ball.css({
                    width: size,
                    height: size
                });
                rotateListener = function (angle) {
                    if (angle > 180) angle -= 360;
                    $msg.text('Slowly and steadily trace down the spine until the waist line.');
                    angle -= zeroAngle;
                    lastAngle = angle;
                    $angle.text(angle.toFixed(2));
                };
                setInterval(function () {
                    $ball.rotate(Math.min(Math.max(lastAngle, -59), 59));
                }, 50);
                var stayCombo = 0;
                var zs = new Array(20), zsum = 0;
                for (var i = 0; i < zs.length; i++) zs[i] = 0;
                accelerationListener = function (dm) {
                    zs.push(len(dm));
                    zsum += -zs.shift() + zs[zs.length - 1];
                    switch (mode) {
                        case 0:
                            if (zsum > 5) {
                                stayCombo++;
                                if (stayCombo > 10) {
                                    stayCombo = 0;
                                    mode++;
                                }
                                if (lastAngle != null) angles.push(lastAngle);
                            } else stayCombo = 0;
                            break;
                        case 1:
                            if (zsum < 5) {
                                stayCombo++;
                                if (stayCombo > 10) {
                                    screen.report.show(angles);
                                }
                            } else stayCombo = 0;
                            break;
                    }
                };
            }, function () {
                rotateListener = null;
                accelerationListener = null;
            });
        },
        initReport: function () {
            var $screen = $('.screen-report');
            var $graph = $('.graph');
            return initScreen($screen, function (angles) {
                $graph.empty();
                var partition = parseInt(angles.length / 10);
                var max = 0;
                for (var i = 0; i < partition * 10; i++) {
                    if (Math.abs(max) < Math.abs(angles[i])) max = angles[i];
                    if (i % partition == partition - 1) {
                        var $dot = $('<div class="dot"></div>');
                        $dot.text(max.toFixed(1));
                        var size = $graph.width() / 10;
                        $dot.css({
                            width: size,
                            height: size,
                            'border-radius': size / 2,
                            marginTop: max / 180 * $graph.height() + $graph.height() / 2 - size / 2,
                            background: 'rgb(' + parseInt(Math.min(Math.abs(max) / 10, 1) * 255) + ',' + parseInt((1 - Math.min(Math.abs(max) / 10, 1)) * 255) + ',0)'
                        });
                        $graph.append($dot);
                        max = 0;
                    }
                }
            });
        }
    };

    var screen = {
        splash: Screen.initSplash(),
        visibleRect: Screen.initVisibleRect(),
        zeroPoint: Screen.initZeroPoint(),
        instruction: Screen.initInstruction(),
        protractor: Screen.initProtractor(),
        report: Screen.initReport()
    };
    screen.splash.show();

    function initScreen($screen, onShow, onHide) {
        return {
            show: function (e) {
                for (var s in screen) screen[s].hide();
                $screen.css('display', '');
                if (onShow) onShow(e);
            },
            hide: function (e) {
                $screen.css('display', 'none');
                if (onHide) onHide(e);
            }
        }
    }

    function requestFullScreen() {
        var reqFuncs = [
            'requestFullscreen',
            'webkitRequestFullscreen',
            'mozRequestFullScreen',
            'msRequestFullscreen'
        ];
        for (var i = 0; i < reqFuncs.length; i++) {
            var reqFunc = reqFuncs[i];
            if (document.body[reqFunc]) {
                document.body[reqFunc]();
                break;
            }
        }
    }

    function len(dm) {
        return Math.sqrt(dm.x * dm.x + dm.y * dm.y + dm.z * dm.z);
    }

    $.fn.rotate = function (degrees) {
        $(this).css({
            '-webkit-transform': 'rotate(' + degrees + 'deg)',
            '-moz-transform': 'rotate(' + degrees + 'deg)',
            '-ms-transform': 'rotate(' + degrees + 'deg)',
            'transform': 'rotate(' + degrees + 'deg)'
        });
        return $(this);
    };

    $.fn.setRotateOrigin = function (x, y) {
        $(this).css({
            '-webkit-transform-origin:': x + ' ' + y,
            '-moz-transform-origin:': x + ' ' + y,
            '-ms-transform-origin': x + ' ' + y,
            'transform-origin:': x + ' ' + y
        });
    }
} catch (e) {
    alert(e);
}