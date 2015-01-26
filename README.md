odoserver
=========

UNDER CONSTRUCTION

commands to set it up on heroku:

```
heroku apps:create odoserver

heroku config:set PASSWORD=change_me
heroku config:set SITES=http://change_me_1.com;http://change_me_2.com

git push heroku +HEAD:master
```
