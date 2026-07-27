// Vercel API forwarding proxy fallback handler
module.exports = (req, res) => {
  res.redirect(307, `https://grownx-api.onrender.com${req.url}`);
};
