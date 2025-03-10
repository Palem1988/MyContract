const Web3 = require('web3');
var db = require('../database/models/index');
var client = db.client;
var Address = db.userCurrencyAddress;
var config = require('../config/paymentListener');
var ws_provider = config.ws_provider;
var provider = new Web3.providers.WebsocketProvider(ws_provider);
var web3 = new Web3(provider);
let Promise = require('bluebird');
provider.on('connect', () => console.log('WS Connected'))
provider.on('error', e => {
  console.log('WS error occured');
  console.log('Attempting to reconnect...');
  provider = new Web3.providers.WebsocketProvider(ws_provider);

  provider.on('connect', function () {
    console.log('WSS Reconnected');
  });

  web3.setProvider(provider);
});
provider.on('end', e => {
  console.log('WS closed');
  console.log('Attempting to reconnect...');
  provider = new Web3.providers.WebsocketProvider(ws_provider);

  provider.on('connect', function () {
    console.log('WSS Reconnected');
  });

  web3.setProvider(provider);
});
var contractInstance = new web3.eth.Contract(config.erc20ABI, config.tokenAddress);
var gasPriceGwei = 12;
module.exports = {
  attachListener: (address) => {
    contractInstance.once('Transfer', {
      filter: {
        from: address
      },
      fromBlock: 'pending',
      toBlock: 'latest'
    }, (err, res) => {
      console.log(err, res.returnValues);
      Address.find({
        where: {
          address: address
        }
      }).then(address => {
        address.getClient().then(async client => {
          client.package1 += 1;
          await client.save();
        });
      });
    });
  },

  attachListenerWithUserHash: (userHash, address) => {
    contractInstance.once('Transfer', {
      filter: {
        from: address,
        value: '1200000000000000000000000'
      },
      fromBlock: 'pending',
      toBlock: 'latest'
    }, (err, res) => {
      console.log(err, res.returnValues);
      client.find({
        where: {
          uniqueId: userHash
        }
      }).then(async client => {
        client.package1 += 1;
        await client.save();
      });
    });
  },

  sendToParent: (address, privateKey) => {
    return new Promise(async function (resolve, reject) {
      var amountToSend = web3.utils.toWei('0.001', 'ether');
      var rawTransaction = {
        "gasPrice": web3.utils.toHex(gasPriceGwei * 1e9),
        "gasLimit": web3.utils.toHex(30000),
        "to": address,
        "value": amountToSend
      };
      web3.eth.accounts.signTransaction(rawTransaction, "0xD493D7F8F82C24BBFC3FE0E0FB14F45BAA8EA421356DC2F7C2B1A9EF455AB8DF").then(result => {
        web3.eth.sendSignedTransaction(result.rawTransaction).then(receipt => {
          console.log("Ether receipt generated");
          var transaction = {
            "from": address,
            "gasPrice": web3.utils.toHex(gasPriceGwei * 1e9),
            "to": config.tokenAddress,
            "value": "0x0",
            "data": contractInstance.methods.transfer(config.diversionAddress, config.amount).encodeABI()
          };
          web3.eth.estimateGas(transaction).then(gasLimit => {
            transaction["gasLimit"] = gasLimit;
            web3.eth.accounts.signTransaction(transaction, privateKey).then(result => {
              web3.eth.sendSignedTransaction(result.rawTransaction).then(receipt => {
                resolve(receipt);
              });
            });
          });
        });
      });
    });
  },

  checkBalance: (address) => {
    return new Promise(function (resolve, reject) {
      contractInstance.methods.balanceOf(address).call().then(balance => {
        resolve(balance / 10 ** 18);
      }).catch(error => {
        reject(error);
      });
    });
  },

  checkEtherBalance: (address) => {
    return new Promise(function (resolve, reject) {
      web3.eth.getBalance(address).then(balance => {
        resolve(web3.utils.fromWei(balance));
      }).catch(error => {
        console.log("Web3 error status", error);
        provider = new Web3.providers.WebsocketProvider(ws_provider);
        web3.setProvider(provider);
        reject(error);
      });
    });
  },
  sendToken: (address, amount) => {
    return new Promise(function (resolve, reject) {
      var provider = new Web3.providers.WebsocketProvider('wss://ropsten.infura.io/ws');
      var web3 = new Web3(provider);
      console.log("Ether receipt generated");
      var transaction = {
        "from": "0x14649976AEB09419343A54ea130b6a21Ec337772",
        "gasPrice": web3.utils.toHex(gasPriceGwei * 1e9),
        "to": "0xc573c48aD1037DD92cB39281e5f55DCb5e033A70",
        "value": "0x0",
        "data": contractInstance.methods.transfer(address, amount + "000000000000000000").encodeABI()
      };
      web3.eth.estimateGas(transaction).then(gasLimit => {
        transaction["gasLimit"] = gasLimit;
        web3.eth.accounts.signTransaction(transaction, "0x25F8170BA33240C0BD2C8720FE09855ADA9D07E38904FC5B6AEDCED71C0A3142").then(result => {
          web3.eth.sendSignedTransaction(result.rawTransaction).then(receipt => {
            resolve(receipt);
          });
        });
      });
    })
  }
}
