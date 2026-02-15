const { wrap } = require('./wrap');

function createChatbotController({ chatbotService }) {
  return {
    chat: wrap(async (req, res) => {
      const { query } = req.body;
      const userContext = req.user || {}; // From session middleware
      
      const response = await chatbotService.processQuery({ query, userContext });
      res.json(response);
    })
  };
}

module.exports = { createChatbotController };
