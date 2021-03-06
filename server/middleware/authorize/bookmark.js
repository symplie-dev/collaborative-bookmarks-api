'use strict';

var HttpErrors = require('../../errors/http');

module.exports = function (app) {
  var Logger = app.get('AuthLogger'),
      Model  = app.get('Model');

  return {
    /**
     * Authorization middleware to check that the user initiating the action on
     * a given bookmark is affiliated with the bookmark.
     * 
     * @param {HttpRequest} req The request object
     * @param {HttpResponse} res The response object
     * @param {Function} next The next middleware function in the stack
     * @return {undefined}
     */
    user: function (req, res, next) {
      var actionUserId = req.params.actionUserId,
          bookmarkId = req.params.bookmarkId,
          reqIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

      if (typeof req.headers['x-cb-sub'] !== 'string') {
        Logger.error('%s - Missing required x-cb-sub header', reqIp);
        res.status(HttpErrors.Const.NotAuthorized.STATUS).json({
          status: HttpErrors.Const.NotAuthorized.STATUS,
          data: { message: HttpErrors.Const.NotAuthorized.MESSAGE }
        });
      } else {
        Model.Bookmark.getAll(bookmarkId).filter({ deletedAt: null }).then(function (bookmark) {
          if (
            bookmark &&
            bookmark.SenderId === actionUserId ||
            bookmark.ReceiverId === actionUserId
          ) {
            next();
          } else {
            Logger.error('%s - %s attempted action on unaffiliated bookmark %s', reqIp, actionUserId, bookmarkId);
            res.status(HttpErrors.Const.NotAuthorized.STATUS).json({
              status: HttpErrors.Const.NotAuthorized.STATUS,
              data: { message: 'This function requires you to be affiliated with the bookmark in question.' }
            });
          }
        });
      }
    },

    /**
     * Authorization middleware to check that the user initiating the action on
     * a given bookmark is the creater of the bookmark.
     * 
     * @param {HttpRequest} req The request object
     * @param {HttpResponse} res The response object
     * @param {Function} next The next middleware function in the stack
     * @return {undefined}
     */
    creator: function (req, res, next) {
      var actionUserId = req.params.actionUserId,
          bookmarkId = req.params.bookmarkId,
          reqIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

      if (typeof req.headers['x-cb-sub'] !== 'string') {
        Logger.error('%s - Missing required x-cb-sub header', reqIp);
        res.status(HttpErrors.Const.NotAuthorized.STATUS).json({
          status: HttpErrors.Const.NotAuthorized.STATUS,
          data: { message: HttpErrors.Const.NotAuthorized.MESSAGE }
        });
      } else {
        Model.Bookmark.get(bookmarkId).then(function (bookmark) {
          if (bookmark.SenderId === actionUserId) {
            next();
          } else {
            Logger.error('%s - %s attempted to elevated action on unowned bookmark %s', reqIp, actionUserId, bookmarkId);
            res.status(HttpErrors.Const.NotAuthorized.STATUS).json({
              status: HttpErrors.Const.NotAuthorized.STATUS,
              data: { message: 'This function requires you to be the creater of the bookmark in question.' }
            });
          }
        });
      }
    }
  };
};