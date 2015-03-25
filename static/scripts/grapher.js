/*
 * Copyright (c) 2015 Alex Yatskov <alex@foosoft.net>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

(function(grapher) {
    'use strict';

    //
    //  Range
    //

    function Range(min, max) {
        this.min = Math.min(min, max);
        this.max = Math.max(min, max);

        this.contains = function(value) {
            return value >= this.min && value <= this.max;
        };

        this.length = function() {
            return this.max - this.min;
        };

        this.clamp = function(value) {
            if (value < this.min) {
                return this.min;
            }

            if (value > this.max) {
                return this.max;
            }

            return value;
        };

        this.include = function(range) {
            this.min = Math.min(this.min, range.min);
            this.max = Math.max(this.max, range.max);
        };

        this.offset = function(value) {
            return (value - this.min) / this.length();
        };

        this.project = function(value) {
            return this.min + this.length() * value;
        };
    }


    //
    //  Column
    //

    function Column(params) {
        var _backdropColor  = '#eeeeec';
        var _borderColor    = '#babdb6';
        var _fillColorNeg   = '#3465a4';
        var _fillColorPos   = '#cc0000';
        var _panelColor     = '#babdb6';
        var _tickColor      = '#888a85';

        var _densitySize    = 10;
        var _desatOffset    = -0.3;
        var _height         = 500;
        var _padding        = 5;
        var _panelSize      = 20;
        var _tickSize       = 5;
        var _width          = 100;
        var _easeTime       = 400;

        var _animation      = null;
        var _canvas         = params.canvas;
        var _data           = params.data;
        var _index          = params.index;
        var _name           = params.name;
        var _valueAnimated  = params.data.value;
        var _onValueChanged = params.onValueChanged;
        var _range          = params.range;
        var _scale          = params.scale;
        var _steps          = params.steps;
        var _elements       = {};

        function createShapes() {
            // backdrop
            _elements.backdrop = _canvas.rect(
                _tickSize, 0, _width - (_densitySize + _tickSize), _height - _panelSize
            ).attr({cursor: 'crosshair', stroke: _borderColor, fill: _backdropColor}).click(clicked);

            // density
            _elements.density = _canvas.rect(
                _width - _densitySize, 0, _densitySize, _height - _panelSize
            ).attr({stroke: _borderColor});

            // panel
            _elements.panel = _canvas.rect( _tickSize,
                _height - _panelSize, _width - _tickSize, _panelSize
            ).attr({fill: _panelColor});

            // label
            _elements.label = _canvas.text(
                _tickSize + (_width - _tickSize) / 2, _height - _panelSize / 2, _name
            ).attr({'dominant-baseline': 'middle', 'text-anchor': 'middle'});

            // indicator
            var range = computeIndicatorRange(_data.value);
            _elements.indicator = _canvas.rect(
                _tickSize, range.min, _width - (_densitySize + _tickSize), (range.max - range.min)
            ).attr({cursor: 'crosshair', fill: computeIndicatorColor(_data.value)}).click(clicked);

            // tick
            if (_range.contains(0.0)) {
                var origin = valueToIndicator(0.0);
                _elements.tick = _canvas.line(0, origin, _width - _densitySize, origin
                ).attr({stroke: _tickColor});
            }

            _elements.group = _canvas.group(
                _elements.backdrop,
                _elements.indicator,
                _elements.density,
                _elements.panel,
                _elements.tick,
                _elements.label
            );

            _elements.group.transform(
                Snap.format('t{x},{y}', {x: _index * (_width + _padding), y: 0})
            );

            updateDensity();
        }

        function updateIndicator(value) {
            var range = computeIndicatorRange(value);
            _elements.indicator.attr({
                y:      range.min,
                height: range.max - range.min,
                fill:   computeIndicatorColor(value)
            });

            _valueAnimated = value;
        }

        function updateDensity() {
            var fill = _backdropColor;
            if (_data.hints.length > 0) {
                fill = _canvas.gradient(decimateHints());
            }

            _elements.density.attr({fill: fill});
        }

        function decimateHints() {
            var colorStops = 'l(0,0,0,1)';

            var groups = groupHints();
            for (var i = 0, count = groups.length; i < count; ++i) {
                var groupSize = groups[i];

                var colorPercent = 0;
                if (_scale.length() > 0) {
                    colorPercent = Math.max(0, groupSize - _scale.min) / _scale.length();
                }

                var colorByte = 0xff - Math.min(0xff, Math.round(0xff * colorPercent));
                var colorObj  = tinycolor({ r: colorByte, g: colorByte, b: colorByte });
                var colorStr  = colorObj.toHexString();

                colorStops += colorStr;
                if (i + 1 < count) {
                    colorStops += '-';
                }
            }

            return colorStops;
        }

        function groupHints() {
            var stepSize = _range.length() / _steps;

            var hintGroups = [];
            for (var i = 0; i < _steps; ++i) {
                var stepMax = _range.max - stepSize * i;
                var stepMin = stepMax - stepSize;

                var hintValue = 0;
                for (var j = 0, count = _data.hints.length; j < count; ++j) {
                    var hint = _data.hints[j];
                    if (hint.sample > stepMin && hint.sample <= stepMax) {
                        hintValue += hint.rating;
                    }
                }

                hintGroups.push(hintValue);
            }

            return hintGroups;
        }

        function updateValue(value) {
            _data.value = _range.clamp(value);
            if (_onValueChanged) {
                _onValueChanged(_name, _data.value);
            }

            animateIndicator(_valueAnimated, _data.value);
        }

        function animateIndicator(valueOld, valueNew) {
            if (valueOld === valueNew) {
                return;
            }

            if (_animation !== null) {
                _animation.stop();
            }

            _animation = Snap.animate(
                valueOld,
                valueNew,
                function(value) {
                    updateIndicator(value);
                },
                _easeTime,
                mina.easeinout,
                function() {
                    _animation = null;
                }
            );
        }

        function valueColorAdjust(value, color, offset) {
            var colorObj = tinycolor(color);
            var rangeEnd = value >= 0.0 ? _range.max : _range.min;
            var rangeMid = (_range.min + _range.max) / 2.0;
            var rangeRat = (value - rangeMid) / (rangeEnd - rangeMid);
            var desatVal = Math.max(0.0, 1.0 - rangeRat + offset) * 100.0;
            return colorObj.desaturate(desatVal).toHexString();
        }

        function computeIndicatorColor(value) {
            var color = value >= 0.0 ? _fillColorPos : _fillColorNeg;
            return valueColorAdjust(value, color, _desatOffset);
        }

        function computeIndicatorRange(value) {
            return new Range(valueToIndicator(0.0), valueToIndicator(value));
        }

        function valueToIndicator(scalar) {
            var box    = _elements.backdrop.getBBox();
            var offset = _range.offset(scalar);
            return box.y + box.height * (1.0 - offset);
        }

        function indicatorToValue(scalar) {
            var box   = _elements.backdrop.getBBox();
            var range = new Range(box.y, box.y + box.height);
            return -_range.project(range.offset(scalar));
        }

        function clicked(event, x, y) {
            var rect = _canvas.node.getBoundingClientRect();
            updateValue(indicatorToValue(y - rect.top));
        }

        this.update = function(data, scale) {
            _scale = scale;

            if (_.has(data, 'value')) {
                _data.value = data.value;
                animateIndicator(_valueAnimated, _data.value);
            }
            if (_.has(data, 'hints')) {
                _data.hints = data.hints;
                updateDensity();
            }
        };

        createShapes();
    }


    //
    //  Grapher
    //

    grapher.Grapher = function(params) {
        var _canvas         = params.canvas;
        var _columns        = {};
        var _data           = {};
        var _range          = new Range(params.range.min || -1.0, params.range.max || 1.0);
        var _steps          = params.steps || 20;
        var _useLocalScale  = params.useLocalScale || false;
        var _displayType    = params.displayType || 'density';
        var _onValueChanged = params.onValueChanged;

        function processHintParameters(columns) {
            var displayTypes = {compatibility: 'compatibility', density: 'count'};
            var statKey      = displayTypes[_displayType];

            for (var name in columns) {
                var column = columns[name];
                for (var i = 0, count = column.hints.length; i < count; ++i) {
                    column.hints[i].rating = column.hints[i].stats[statKey];
                }
            }
        }

        function computeLocalScale(columnData) {
            var ratings = _.map(columnData.hints, function(hint) {
                return hint.rating;
            });

            return new Range(0, _.max(ratings));
        }

        function computeGlobalScale(columnsData) {
            var globalScale = null;
            for (var name in columnsData) {
                var localScale = computeLocalScale(columnsData[name]);
                if (globalScale) {
                    globalScale.include(localScale);
                }
                else {
                    globalScale = localScale;
                }
            }

            return globalScale;
        }

        this.setColumns = function(columnsData) {
            processHintParameters(columnsData);

            var scale = null;
            if (!_useLocalScale) {
                scale = computeGlobalScale(columnsData);
            }

            var index = 0;
            for (var name in columnsData) {
                var columnData = _data[name] = columnsData[name];
                if (_useLocalScale) {
                    scale = computeLocalScale(columnData);
                }

                var column = _columns[name];
                if (column) {
                    column.update(columnData, scale);
                }
                else {
                    _columns[name] = new Column({
                        onValueChanged: _onValueChanged,
                        steps:          _steps,
                        range:          _range,
                        canvas:         _canvas,
                        data:           columnData,
                        name:           name,
                        scale:          scale,
                        index:          index++,
                    });
                }
            }
        };

        this.setUseLocalScale = function(useLocalScale) {
            if (useLocalScale != _useLocalScale) {
                _useLocalScale = useLocalScale;
                this.setColumns(_data);
            }
        };

        this.setDisplayType = function(displayType) {
            if (displayType != _displayType) {
                _displayType = displayType;
                this.setColumns(_data);
            }
        };
    };
}(window.grapher = window.grapher || {}));