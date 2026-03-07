const GoogleStrategy = require('passport-google-oauth20').Strategy;
const NaverStrategy  = require('passport-naver').Strategy;
const User = require('../models/User');

module.exports = (passport) => {
  passport.serializeUser((user, done) => done(null, user._id.toString()));
  passport.deserializeUser(async (id, done) => {
    try { const user = await User.findById(id).select('-password'); done(null, user); }
    catch (err) { done(err, null); }
  });
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== '') {
    passport.use(new GoogleStrategy({ clientID: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET, callbackURL: `${process.env.BASE_URL}/api/auth/google/callback` }, async (at, rt, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value || null;
        let user = await User.findOne({ googleId: profile.id });
        if (!user && email) user = await User.findOne({ email });
        if (user) { if (!user.googleId) user.googleId = profile.id; }
        else { user = new User({ googleId: profile.id, email, name: profile.displayName || '', avatar: profile.photos?.[0]?.value || '', coins: 1 }); }
        user.lastLogin = new Date(); await user.save(); done(null, user);
      } catch (err) { done(err, null); }
    }));
  }
  if (process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_ID !== '') {
    passport.use(new NaverStrategy({ clientID: process.env.NAVER_CLIENT_ID, clientSecret: process.env.NAVER_CLIENT_SECRET, callbackURL: `${process.env.BASE_URL}/api/auth/naver/callback` }, async (at, rt, profile, done) => {
      try {
        const email = profile.email || null;
        let user = await User.findOne({ naverId: profile.id });
        if (!user && email) user = await User.findOne({ email });
        if (user) { if (!user.naverId) user.naverId = profile.id; }
        else { user = new User({ naverId: profile.id, email, name: profile.displayName || profile.nickname || '', avatar: profile.profileImage || '', coins: 1 }); }
        user.lastLogin = new Date(); await user.save(); done(null, user);
      } catch (err) { done(err, null); }
    }));
  }
};
