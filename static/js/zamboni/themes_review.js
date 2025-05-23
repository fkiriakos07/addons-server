import $ from 'jquery';
import _ from 'underscore';
import { _pd } from '../lib/prevent-default';
import { keys } from '../zamboni/keys';
import {
  search_result_row_template,
  search_results_template,
} from './themes_review_templates';
/* jQuery.ScrollTo by Ariel Flesler */
$.fn.scrollTo = function (opts) {
  if (!this.length) return this;
  opts = $.extend(
    {
      duration: 250,
      marginTop: 0,
      complete: undefined,
    },
    opts || {},
  );
  let top = this.offset().top - opts.marginTop;
  $('html, body').animate(
    { scrollTop: top },
    opts.duration,
    undefined,
    opts.complete,
  );
  return this;
};

function fieldFocused(e) {
  let tags = /input|keygen|meter|option|output|progress|select|textarea/i;
  return tags.test(e.target.nodeName);
}

(function () {
  let win = $(window);
  let doc = $(document);

  $.fn.themeQueue = function () {
    return this.each(function () {
      let queue = this;
      let currentTheme = 0;
      let cacheQueueHeight;

      let $queueContext = $('.queue-context');
      let actionConstants = $queueContext.data('actions');

      let themesList = $('div.theme', queue);
      let themes = themesList
        .map(function () {
          return {
            element: this,
            top: 0,
          };
        })
        .get();

      function nthTheme(i) {
        return themesList[i];
      }

      doc.scroll(
        _.throttle(function () {
          updateMetrics();
          let i = findCurrentTheme();
          if (i >= 0 && i != currentTheme) {
            switchTheme(findCurrentTheme());
          }
          // Undo sidebar-truncation fix in goToTheme if user goes
          // into free-scrolling mode.
          if (i === 0) {
            $('.sidebar').removeClass('lineup');
          }
        }, 250),
      );

      doc.keyup(function (e) {
        if (!$(queue).hasClass('shortcuts')) return;

        // Ignore key-bindings when textarea focused.
        if (fieldFocused(e) && e.which != keys.ENTER) return;

        // For using Enter to submit textareas.
        if (e.which == keys.ENTER && keys.ENTER in keymap) {
          keymap[keys.ENTER]();
        }

        let key = String.fromCharCode(e.which).toLowerCase();

        if (!(key in keymap)) {
          return;
        }

        let action = keymap[key];
        if (action && !e.ctrlKey && !e.altKey && !e.metaKey) {
          themeActions[action[0]](currentTheme, action[1]);
        }
      });

      // Pressing Enter in text field doesn't add carriage return.
      $('textarea').keypress(function (e) {
        if (e.keyCode == keys.ENTER) {
          e.preventDefault();
        }
      });

      $('.theme', queue).removeClass('active');
      updateMetrics();
      switchTheme(findCurrentTheme());

      function updateMetrics() {
        let queueHeight = $(queue).height();
        if (queueHeight === cacheQueueHeight) return;
        cacheQueueHeight = queueHeight;

        $.each(themes, function (i, obj) {
          let elem = $(obj.element);
          obj.top = elem.offset().top + elem.outerHeight() / 2;
        });
      }

      function getThemeParent(elem) {
        // Given an element (like an approve button),
        // return the theme for which it is related to.
        return $(elem).closest('.theme').data('id');
      }

      function goToTheme(i, delay, duration) {
        delay = delay || 0;
        duration = duration || 250;
        setTimeout(function () {
          if (i >= 0 && i < themes.length) {
            $(themes[i].element).scrollTo({
              duration: duration,
              marginTop: 20,
            });
          }
        }, delay);
        $('.rq-dropdown').hide();
      }

      function switchTheme(i) {
        if (!themes[currentTheme]) {
          return;
        }

        $(themes[currentTheme].element).removeClass('active');
        $(themes[i].element).addClass('active');
        vertAlignSidebar(win, $('.theme.active'));
        currentTheme = i;
        $('.rq-dropdown').hide();
      }

      function findCurrentTheme() {
        // Uses location of the window within the page to determine
        // which theme we're currently looking at.

        // $(window).scroll() fires too early.
        if (!themes[currentTheme]) {
          return 0;
        }

        let pageTop = win.scrollTop();
        if (pageTop <= themes[currentTheme].top) {
          for (let i = currentTheme - 1; i >= 0; i--) {
            if (themes[i].top < pageTop) {
              return i + 1;
            }
          }
        } else {
          for (let i = currentTheme; i < themes.length; i++) {
            // Scroll down the themes until we find a theme
            // that is at the top of our page. That is our current
            // theme.
            if (pageTop <= themes[i].top) {
              return i;
            }
          }
        }
      }

      let keymap = {
        j: ['next', null],
        k: ['prev', null],
        a: ['approve', null],
        r: ['reject_reason', null],
        d: ['duplicate', null],
        f: ['flag', null],
        m: ['moreinfo', null],
      };
      // keymap[0] = ['other_reject_reason', 0];
      for (let j = 1; j <= 9; j++) {
        keymap[j] = ['reject', j];
      }

      function setReviewed(i, action) {
        let ac = actionConstants;
        let actionMap = {};
        actionMap[ac.moreinfo] = [gettext('Requested Info'), 'blue'];
        actionMap[ac.flagged] = [gettext('Flagged'), 'red'];
        actionMap[ac.duplicate] = [gettext('Duplicate'), 'red'];
        actionMap[ac.reject] = [gettext('Rejected'), 'red'];
        actionMap[ac.approve] = [gettext('Approved'), 'green'];
        let text = actionMap[action][0];
        let color = actionMap[action][1];

        $(nthTheme(i)).addClass('reviewed');
        $('.status', nthTheme(i))
          .removeClass('red blue green')
          .addClass('reviewed ' + color)
          .find('.status-text')
          .text(text);

        $('#reviewed-count').text($('div.theme.reviewed').length);
        if ($(queue).hasClass('advance')) {
          goToTheme(i + 1, 250);
        } else {
          delete keymap[keys.ENTER];
          $('.rq-dropdown').hide();
        }
      }

      let isRejecting = false;
      $(document).on(
        'click',
        'li.reject_reason',
        _pd(function (e) {
          if (isRejecting) {
            let i = getThemeParent(e.currentTarget);
            let rejectId = $(this).data('id');
            if (rejectId === 0) {
              themeActions.other_reject_reason(i);
            } else {
              themeActions.reject(i, rejectId);
            }
          }
        }),
      );

      let themeActions = {
        next: function (i) {
          goToTheme(i + 1);
        },
        prev: function (i) {
          goToTheme(i - 1);
        },

        approve: function (i) {
          $('input.action', nthTheme(i)).val(actionConstants.approve);
          setReviewed(i, actionConstants.approve);
        },

        reject_reason: function (i) {
          // Open up dropdown of rejection reasons and set up
          // key and click-bindings for choosing a reason. This
          // function does not actually do the rejecting as the
          // rejecting is only done once a reason is supplied.
          $('.rq-dropdown:not(.reject-reason-dropdown)').hide();
          $('.reject-reason-dropdown', nthTheme(i)).toggle();
          isRejecting = true;
        },

        other_reject_reason: function (i) {
          if (!isRejecting) {
            return;
          }

          // Open text area to enter in a custom rejection reason.
          $('.rq-dropdown:not(.reject-reason-detail-dropdown)').hide();
          $('.reject-reason-detail-dropdown', nthTheme(i)).toggle();
          let textArea = $(
            '.reject-reason-detail-dropdown textarea',
            nthTheme(i),
          ).focus();

          // Submit link/URL of the duplicate.
          let submit = function () {
            if (textArea.val()) {
              $('input.comment', nthTheme(i)).val(textArea.val());
              textArea.blur();
              themeActions.reject(i, 0);
            } else {
              $(
                '.reject-reason-detail-dropdown .error-required',
                nthTheme(i),
              ).show();
            }
          };
          keymap[keys.ENTER] = submit;
          $('.reject-reason-detail-dropdown button').click(_pd(submit));
        },

        reject: function (i, rejectId) {
          if (!isRejecting) {
            return;
          }

          // Given the rejection reason, does the actual rejection of
          // the Theme.
          $('input.action', nthTheme(i)).val(actionConstants.reject);
          $('input.reject-reason', nthTheme(i)).val(rejectId);
          setReviewed(i, actionConstants.reject);
          isRejecting = false;
        },

        duplicate: function (i) {
          // Open up dropdown to enter ID/URL of duplicate.
          $('.rq-dropdown:not(.duplicate-dropdown)').hide();
          $('.duplicate-dropdown', nthTheme(i)).toggle();
          let textArea = $('.duplicate-dropdown textarea', nthTheme(i)).focus();

          // Submit link/URL of the duplicate.
          let submit = function () {
            if (textArea.val()) {
              $('input.action', nthTheme(i)).val(actionConstants.duplicate);
              $('input.comment', nthTheme(i)).val(textArea.val());
              textArea.blur();
              setReviewed(i, actionConstants.duplicate);
            } else {
              $('.duplicate-dropdown .error-required', nthTheme(i)).show();
            }
          };
          keymap[keys.ENTER] = submit;
          $('.duplicate-dropdown button').click(_pd(submit));
        },

        flag: function (i) {
          // Open up dropdown to enter reason for flagging.
          $('.rq-dropdown:not(.flag-dropdown)').hide();
          $('.flag-dropdown', nthTheme(i)).toggle();
          let textArea = $('.flag-dropdown textarea', nthTheme(i)).focus();

          // Submit link/URL of the flag.
          let submit = function () {
            if (textArea.val()) {
              $('input.action', nthTheme(i)).val(actionConstants.flag);
              $('input.comment', nthTheme(i)).val(textArea.val());
              textArea.blur();
              setReviewed(i, actionConstants.flagged);
            } else {
              $('.flag-dropdown .error-required', nthTheme(i)).show();
            }
          };
          keymap[keys.ENTER] = submit;
          $('.flag-dropdown button').click(_pd(submit));
        },

        moreinfo: function (i) {
          // Open up dropdown to enter ID/URL of moreinfo.
          $('.rq-dropdown:not(.moreinfo-dropdown)').hide();
          $('.moreinfo-dropdown', nthTheme(i)).toggle();
          let textArea = $('.moreinfo-dropdown textarea', nthTheme(i)).focus();

          // Submit link/URL of the moreinfo.
          let submit = function () {
            if (textArea.val()) {
              $('input.action', nthTheme(i)).val(actionConstants.moreinfo);
              $('input.comment', nthTheme(i)).val(textArea.val());
              textArea.blur();
              setReviewed(i, actionConstants.moreinfo);
            } else {
              $('.moreinfo-dropdown .error-required', nthTheme(i)).show();
            }
          };
          keymap[keys.ENTER] = submit;
          $('.moreinfo-dropdown button').click(_pd(submit));
        },

        clearReview: function (i) {
          $(
            'input.action, input.comment, input.reject-reason',
            nthTheme(i),
          ).prop('value', '');
          $(nthTheme(i)).removeClass('reviewed');
          $('.status', nthTheme(i)).removeClass('reviewed');

          $('#reviewed-count').text($('div.theme.reviewed').length);
        },
      };

      $(document)
        .on(
          'click',
          'button.approve',
          _pd(function (e) {
            themeActions.approve(getThemeParent(e.currentTarget));
          }),
        )
        .on(
          'click',
          'button.reject',
          _pd(function (e) {
            themeActions.reject_reason(getThemeParent(e.currentTarget));
          }),
        )
        .on(
          'click',
          'button.duplicate',
          _pd(function (e) {
            themeActions.duplicate(getThemeParent(e.currentTarget));
          }),
        )
        .on(
          'click',
          'button.flag',
          _pd(function (e) {
            themeActions.flag(getThemeParent(e.currentTarget));
          }),
        )
        .on(
          'click',
          'button.moreinfo',
          _pd(function (e) {
            themeActions.moreinfo(getThemeParent(e.currentTarget));
          }),
        )
        .on(
          'click',
          '.clear-review',
          _pd(function (e) {
            themeActions.clearReview(getThemeParent(e.currentTarget));
          }),
        );
    });
  };

  $.fn.themeQueueOptions = function (queueSelector) {
    return this.each(function () {
      let self = this;

      $('input', self).click(onChange);
      $('select', self).change(onChange);
      onChange();

      function onChange(e) {
        let category = $('#rq-category', self).val();
        let advance = $('#rq-advance:checked', self).val();
        let shortcuts = $('#rq-shortcuts:checked', self).val();

        $(queueSelector)
          .toggleClass('advance', !!advance)
          .toggleClass('shortcuts', !!shortcuts);
      }
    });
  };
})();

function vertAlignSidebar(win) {
  let activeThemeTop = $('.theme.active').offset().top - win.scrollTop();
  $('.sidebar .align.fixed').css('top', activeThemeTop + 'px');
}

$(document).ready(function () {
  let $theme_queue = $('.theme-queue');
  if ($theme_queue.length) {
    $('.zoombox').zoomBox();
    $('.zoombox img').previewPersona();
    $theme_queue.themeQueue();
    $('.sidebar').themeQueueOptions('.theme-queue');
    $('#commit').click(
      _pd(function (e) {
        $('#theme-queue-form').submit();
      }),
    );

    // Align sidebar with active theme.
    if ($('.theme.active').length) {
      let win = $(window);
      win.scroll(
        _.throttle(function () {
          vertAlignSidebar(win);
        }, 100),
      );
      vertAlignSidebar(win);
    }

    // If daily message is present, align fixed sidebar.
    if (['none', undefined].indexOf($('.daily-message').css('display')) < 0) {
      let $sidebar = $('.sidebar .align.fixed');
      let top = parseInt($sidebar.css('top'), 10) + 82;
      $sidebar.css('top', top + 'px');
    }
  }

  if ($('.theme-search').length) {
    initSearch();
  }
});

function initSearch() {
  let no_results =
    '<p class="no-results">' + gettext('No results found') + '</p>';

  let $clear = $('.clear-queue-search'),
    $appQueue = $('.search-toggle'),
    $search = $('.queue-search'),
    $searchIsland = $('#search-island');

  if ($search.length) {
    let apiUrl = $search.data('api-url');
    let review_url = $search.data('review-url');
    let statuses = $searchIsland.data('statuses');

    $('form', $search).submit(
      _pd(function () {
        let $form = $(this);
        $.get(apiUrl, $form.serialize()).done(function (data) {
          // Hide app queue.
          $appQueue.hide();
          $clear.show();
          // Show results.
          if (data.meta.total_count === 0) {
            $searchIsland.html(no_results).show().removeClass('hidden');
          } else {
            let results = [];
            $.each(data.objects, function (i, item) {
              item = buildThemeResultRow(item, review_url, statuses);
              results.push(search_result_row_template(item));
            });
            $searchIsland.html(
              search_results_template({ rows: results.join('') }),
            );
            $searchIsland.removeClass('hidden').show();
          }
        });
      }),
    );
  }
}

function buildThemeResultRow(theme, review_url, statuses) {
  // Add some extra pretty attrs for the template.
  theme.name = theme.name[0];

  // Rather resolve URLs in backend, infer from slug.
  theme.review_url = review_url.replace('__slug__', theme.slug);
  theme.status = statuses[theme.status];
  return theme;
}
