/**
 * The Zendesk resource API gets category data
 * from an existing project.
 * @module zendesk-api/categories
 */

var common = require('../common');

var category = module.exports = {
  // selfies
  key: 'zd_category',
  base_url: '/api/v2/help_center/',
  timeout: 500,
  logging: true,
  STRING_RADIX: 10,
  events: {
    'zdCategories.done': 'zdCategoriesDone',
    'zdCategoryGetTranslations.done': 'zdCategoryGetTranslationsDone',
    'zdCategoryUpdate.done': 'zdCategoryUpdateDone',
    'zdCategoryInsert.done': 'zdCategoryInsertDone',
    'zdCategoryGetTranslations.fail': 'zdCategorySyncError',
    'zdCategories.fail': 'zdCategorySyncError',
  },
  requests: {
    zdCategories: function() {
      return {
        url: category.base_url + 'categories.json' + "?per_page=5",
        type: 'GET',
        dataType: 'json'
      };
    },
    zdCategoriesSLTranslations: function() {
      return {
        url: category.base_url + '/categories.json?include=translations',
        type: 'GET',
        dataType: 'json'
      };
    },
    zdCategoryGetTranslations: function(id) {
      return {
        url: category.base_url + 'categories/' + id + '/translations',
        type: 'GET',
        beforeSend: function(jqxhr, settings) {
          jqxhr.id = id;
        },
        contentType: 'application/json'
      };
    },
    zdCategoryInsert: function(data, categoryId) {
      return {
        url: category.base_url + 'categories/' + categoryId +
          '/translations.json',
        type: 'POST',
        data: JSON.stringify(data),
        contentType: 'application/json'
      };
    },
    zdCategoryUpdate: function(data, id, locale) {
      return {
        url: category.base_url + 'categories/' + id + '/translations/' +
          locale + '.json',
        type: 'PUT',
        data: JSON.stringify(data),
        contentType: 'application/json'
      };
    },
  },
  eventHandlers: {
    zdCategoriesDone: function(data, textStatus) {
      if (category.logging) {
        console.log('Zendesk Categories retrieved with status:' +
          textStatus);
      }
      this.store(category.key, data);
      console.log('done, removing key');
      this.syncStatus = _.without(this.syncStatus, category.key);
      this.checkAsyncComplete();
    },
    zdCategorySyncError: function(jqXHR, textStatus) {
      if (category.logging) {
        console.log('Zendesk Category Retrieved with status:' + textStatus);
      }
      this.syncStatus = _.without(this.syncStatus, category.key);
      this.checkAsyncComplete();
      //this.uiErrorPageInit();
      if (jqXHR.status === 401) {
        console.log('login error');
        //this.updateMessage("txLogin", "error");
      }
    },
    zdCategoryGetTranslationsDone: function(data, textStatus, jqXHR) {
      if (category.logging) {
        console.log('Zendesk Category Translations retrieved with status:' +
          textStatus);
      }
      this.syncStatus = _.without(this.syncStatus, category.key + jqXHR.id);
      this.checkAsyncComplete();
    },
    zdCategoryInsertDone: function(data, textStatus) {
      console.log('Transifex Resource inserted with status:' + textStatus);
    },
    zdCategoryUpdateDone: function(data, textStatus) {
      console.log('Transifex Resource updated with status:' + textStatus);
    },
  },
  actionHandlers: {
    displayCategories: function() {
      var pageData = this.store(category.key);
      pageData = [pageData];
      this.switchTo('sync_categorys', {
        dataset: pageData,
      });
    },
    zdUpsertCategoryTranslation: function(resource_data, category_id,
      zdLocale) {
      if (category.logging) {
        console.log('Upsert Category with Id:' + category_id +
          'and locale:' + zdLocale);
      }

      /* var localeRegion = zdLocale.split('-');
       if (localeRegion.length > 1 && localeRegion[0] == localeRegion[1]) {
         zdLocale = localeRegion[0];
       }
       */
      var translationData;
      if (this.featureConfig('html-tx-resource')) {
        translationData = common.translationObjectFormat(this.featureConfig,
          resource_data, zdLocale);
      } else {
        translationData = common.translationObjectFormat(this.featureConfig,
          resource_data, zdLocale);
      }
      /*
      var i = _.findIndex(locales, {
        id: parseInt(category_id, 10)
      });
      */
      var translations = this.store(category.key + category_id);
      var checkLocaleExists = (typeof translations[zdLocale] ===
        'undefined') ? false : true;
      if (checkLocaleExists) {
        this.ajax('zdCategoryUpdate', translationData, category_id,
          zdLocale);
      } else {
        this.ajax('zdCategoryInsert', translationData, category_id);
      }
    },
    asyncGetZdCategories: function() {
      if (category.logging) {
        console.log('function: [asyncGetZdCategories]');
      }
      this.syncStatus.push(category.key);
      var that = this;
      setTimeout(
        function() {
          that.ajax('zdCategories');
        }, category.timeout);
    },
    asyncGetZdCategoryTranslations: function(id) {
      if (category.logging) {
        console.log('function: [asyncGetZdCategoryTranslation]');
      }
      this.syncStatus.push(category.key + id);
      var that = this;
      setTimeout(
        function() {
          that.ajax('zdCategoryGetTranslations', id);
        }, category.timeout);
    },

  },
  jsonHandlers: {
    getSingle: function(id, a) {
      if (typeof id == 'string' || id instanceof String)
        id = parseInt(id, category.STRING_RADIX);
      var i = _.findIndex(a.categorys, {
        id: id
      });
      return a.categorys[i];
    },
    calcResourceName: function(obj) {
      var ret = obj.categorys;
      var type = 'categorys';
      if (this.featureConfig('html-tx-resource')) {
        type = 'HTML-' + type;
      }
      var typeString = type + '-';
      // Get the array key and use it as a type
      var limit = obj.categorys.length;
      for (var i = 0; i < limit; i++) {
        ret[i] = _.extend(ret[i], {
          resource_name: typeString + ret[i].id
        });
      }
      return {
        categorys: ret
      };
    },
    getName: function(id, a) {
      if (a.categorys instanceof Array) {
        var i = _.findIndex(a.categorys, {
          id: id
        });
        return a.categorys[i]["name"];
      } else {
        return a.name;
      }

    },
    getTitle: function(id, a) {
      if (a.categorys instanceof Array) {
        var i = _.findIndex(a.categorys, {
          id: id
        });
        return a.categorys[i]["title"];
      } else {
        return a.title;
      }
    },
    getBody: function(id, a) {
      if (a.categorys instanceof Array) {
        var i = _.findIndex(a.categorys, {
          id: id
        });
        return a.categorys[i]["body"];
      } else {
        return a.body;
      }
    },
    checkPagination: function(a) {
      var i = a.page_count;
      console.log(a);
      console.log(i);
      if (typeof i === 'string') {
        i = parseInt(i, 10);
      }
      if (typeof i === 'number') {
        if (i > 1) {
          return true;
        }
      }
      return false;
    },

    getPages: function(a) {
      var i = a.page_count;
      return _.range(1, i + 1);
    },
    getCurrentPage: function(a) {
      var i = a.page;
      return i;
    },
    isFewer: function(a, i) {
      if (i > 1) {
        return true;
      }
      return false;
    },
    isMore: function(a, i) {
      if (a.page_count > i) {
        return true;
      }
      return false;
    },
  }
};
