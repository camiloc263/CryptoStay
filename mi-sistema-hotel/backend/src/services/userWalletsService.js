function createUserWalletsService({ userWalletsRepo }) {
  function normWallet(w) {
    return String(w || '').trim().toLowerCase();
  }

  function isWallet(w) {
    return /^0x[0-9a-f]{40}$/.test(normWallet(w));
  }

  return {
    async listMine({ user_id }) {
      return userWalletsRepo.listByUser({ user_id });
    },

    async linkMine({ user_id, wallet }) {
      const w = normWallet(wallet);
      if (!isWallet(w)) {
        const err = new Error('Wallet inválida');
        err.status = 400;
        throw err;
      }

      const exists = await userWalletsRepo.findByWallet({ wallet: w });
      if (exists && Number(exists.user_id) !== Number(user_id)) {
        const err = new Error('Esa wallet ya está vinculada a otro usuario');
        err.status = 409;
        throw err;
      }

      if (exists && Number(exists.user_id) === Number(user_id)) {
        // already linked: just return current list
        return { alreadyLinked: true, wallet: w };
      }

      const linked = await userWalletsRepo.linkWallet({ user_id, wallet: w, is_primary: 1 });
      return { linked };
    },
  };
}

module.exports = { createUserWalletsService };
