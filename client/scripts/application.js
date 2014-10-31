/*

   The MIT License (MIT)

   Copyright (c) 2014 Alex Yatskov

   Permission is hereby granted, free of charge, to any person obtaining a copy
   of this software and associated documentation files (the "Software"), to deal
   in the Software without restriction, including without limitation the rights
   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is
   furnished to do so, subject to the following conditions:

   The above copyright notice and this permission notice shall be included in
   all copies or substantial portions of the Software.

   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   THE SOFTWARE.

*/

(function(hscd) {
    'use strict';

    var ctx = {};
    var log = [];

    function onAdjust(name, value) {
        ctx.searchParams[name] = value;

        var query = {
            searchParams: ctx.searchParams,
            searchRange:  ctx.searchRange,
            minScore:     ctx.minScore,
            hintSteps:    ctx.hintSteps,
            maxResults:   ctx.maxResults
        };

        $.getJSON('/search', query, function(results) {
            saveSnapshot(results);
            outputSnapshot(results);
        });
    }

    function onSearch() {
        var keywords = $('#keywordsToSearch').val() || [];
        var searchParams = {};

        for (var i = 0, count = keywords.length; i < count; ++i) {
            searchParams[keywords[i]] = 1.0;
        }

        var query = {
            searchParams: searchParams,
            searchRange:  { min: -1.0, max: 1.0 },
            minScore:     parseFloat($('#minScore').val()),
            hintSteps:    parseInt($('#hintSteps').val()),
            maxResults:   parseInt($('#maxResults').val())
        };

        $.getJSON('/search', query, function(results) {
            ctx.searchParams = query.searchParams;
            ctx.searchRange  = query.searchRange;
            ctx.minScore     = query.minScore;
            ctx.hintSteps    = query.hintSteps;
            ctx.maxResults   = query.maxResults;

            ctx.grapher = new grapher.Grapher({
                canvas:           new Snap('#svg'),
                range:            ctx.searchRange,
                useLocalScale:    true,
                useRelativeScale: true
            });
            ctx.grapher.setColumns(results.columns);
            ctx.grapher.setValueChangedListener(onAdjust);

            saveSnapshot(results);
            outputMatches(results.items, results.count);

            $('#query').text(keywords.join(', '));
            $('#useLocalScale').click(function() {
                var useLocalScale = $('#useLocalScale').is(':checked');
                ctx.grapher.setUseLocalScale(useLocalScale);
            });
            $('#useRelativeScale').click(function() {
                var useRelativeScale = $('#useRelativeScale').is(':checked');
                ctx.grapher.setUseRelativeScale(useRelativeScale);
            });
            $('#input').fadeOut(function() {
                $('#output').fadeIn();
            });
        });
    }

    function onLearn() {
        $('#learnKeyword').prop('disabled', true);
        $('#learnError').slideUp(function() {
            var query = {
                keyword: $('#keywordToLearn').val(),
                params:  ctx.searchParams
            };

            $.getJSON('/add_keyword', query, function(results) {
                if (results.success) {
                    $('#learnDialog').modal('hide');
                }
                else {
                    $('#learnError').slideDown(function() {
                        $('#learnKeyword').prop('disabled', false);
                    });
                }
            });
        });
    }

    function onForget() {
        $('#forgetKeyword').prop('disabled', true);
        $('#forgetError').slideUp(function() {
            var query = {
                keyword: $('#keywordToForget').val()
            };

            $.getJSON('/remove_keyword', query, function(results) {
                if (results.success) {
                    $('#forgetDialog').modal('hide');
                }
                else {
                    $('#forgetError').slideDown(function() {
                        $('#forgetKeyword').prop('disabled', false);
                    });
                }
            });
        });
    }

    function onSelectSnapshot() {
        var index = $('#history').slider('getValue');
        outputSnapshot(log[index]);
    }

    function saveSnapshot(results) {
        log.push(results);

        var count = log.length;
        var history = $('#history').slider();
        history.slider('setAttribute', 'max', count - 1);
        history.slider('setValue', count - 1);

        if (count > 1) {
            $('#history').parent().slideDown();
        }
    }

    function outputSnapshot(results) {
        ctx.grapher.updateColumns(results.columns);
        outputMatches(results.items, results.count);
    }

    function outputMatches(results, count) {
        var searchResultCnt = String(results.length);
        if (results.length < count) {
            searchResultCnt += ' of ' + count;
        }
        $('#count').text(searchResultCnt);

        var template = Handlebars.compile($('#template').html());
        $('#results').empty();
        $('#results').append(template({'results': results}));
    }

    $(document).on({
        ajaxStart: function() {
            $('#spinner').show();
        },

        ajaxStop: function() {
            $('#spinner').hide();
        },

        ready: function() {
            $('#keywordsToSearch').selectpicker();
            $('#history').slider({
                formatter: function(value) {
                    var delta = log.length - (value + 1);
                    switch (delta) {
                        case 0:
                            return 'Most recent query';
                        case 1:
                            return 'Previous query';
                        default:
                            return String(delta) + ' queries back';
                    }
                }
            });

            $.getJSON('/get_keywords', function(keywords) {
                $('#searchKeywords').click(onSearch);
                for (var i = 0, count = keywords.length; i < count; ++i) {
                    $('#keywordsToSearch').append($('<option></option>', {
                        value: keywords[i],
                        text:  keywords[i]
                    }));
                }
                $('#keywordsToSearch').selectpicker('refresh');
                $('#keywordsToSearch').change(function() {
                    $('#searchKeywords').prop('disabled', !$(this).val());
                });

                $('#forgetKeyword').click(onForget);
                $('#forgetDialog').on('show.bs.modal', function() {
                    $('#forgetError').hide();
                    $.getJSON('/get_keywords', function(keywords) {
                        $('#forgetKeyword').prop('disabled', keywords.length === 0);
                        $('#keywordToForget').empty();
                        for (var i = 0, count = keywords.length; i < count; ++i) {
                            $('#keywordToForget').append($('<option></option>', {
                                value: keywords[i],
                                text:  keywords[i]
                            }));
                        }
                    });
                });

                $('#history').on('slideStop', onSelectSnapshot);
                $('#learnKeyword').click(onLearn);
                $('#keywordToLearn').bind('input', function() {
                    $('#learnKeyword').prop('disabled', !$(this).val());
                });
                $('#learnDialog').on('show.bs.modal', function() {
                    $('#learnKeyword').prop('disabled', true);
                    $('#keywordToLearn').val('');
                    $('#learnError').hide();
                });
            });
        }
    });

}(window.hscd = window.hscd || {}));

/*
global
    $,
    Handlebars,
    document,
    grapher,
    window,
*/
