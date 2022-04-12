import React, { useState, useEffect } from "react";
import "./calc.css";
import veJoeImg from "../veJOE.png";
import joe from "../joe.png";
import { getPoolLength, getPoolInfo, joePerSec, calcBaseAPR, calcBoostedAPR } from "../utils/farms";
import { ethers } from "ethers";
import { ApolloClient, InMemoryCache, gql } from "@apollo/client";
import { poolsQuery, pairsQuery, veJoeQuery } from "../query";
import { boostedURL, exchangeURL, veJoeURL } from "../urls";

export default function Calc() {
  const [pairs, setPairs] = useState([]);
  const [boostedPools, setBoostedPools] = useState([]);
  const [poolInfos, setPoolInfos] = useState([])
  const [selectedPairID, setSelectedPairID] = useState("");
  const [selectedPair, setSelectedPair] = useState({});
  const [selectedBoostedPool, setSelectedBoostedPool] = useState({});
  const [token0Value, setToken0Value] = useState(0);
  const [token1Value, setToken1Value] = useState(0);
  const [loading, setLoading] = useState(true);
  const [poolShare, setPoolShare] = useState(0);
  const [veJoeData, setVeJoeData] = useState({});
  const [joeStake, setJoeStake] = useState(0);
  const [joePerSecond, setJoePerSecond] = useState(0);
  const [veJoeSupply, setVEJoeSupply] = useState(0);
  const [baseAPR, setBaseAPR] = useState(0);
  const [totalAllocPoint, setTotalAllocPoint] = useState(0);
  const [userAddr, setUserAddr] = useState("");
  const [userVeJoe, setUserVeJoe] = useState({});
  const [currentBoostedAPR, setCurrentBoostedAPR] = useState(0);
  const [estimatedBoostedAPR, setEstimatedBoostedAPR] = useState(0);
  const [userLiqTokens, setUserLiqTokens] = useState(0);
  const [actualLiqTokens, setActualLiqTokens] = useState(0);
  const boostedClient = new ApolloClient({
    uri: boostedURL,
    cache: new InMemoryCache(),
  });
  const exchangeClient = new ApolloClient({
    uri: exchangeURL,
    cache: new InMemoryCache(),
  });
  const veJoeClient = new ApolloClient({
    uri: veJoeURL,
    cache: new InMemoryCache(),
  });

  useEffect(() => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      provider.send("eth_requestAccounts", []).then((resp) => {
        setUserAddr(resp[0]);
      });
    } catch (err) {
      alert(
        "Web3 provider not found. Please manually fill in your account address."
      );
    }

    joePerSec()
      .then((resp) => {
        setJoePerSecond(resp);
      })
      .catch((err) => {
        console.log("failed to load joePerSec: ", err);
      });

    getPoolLength().then(resp => {
      let ps = []
      for(let i = 0; i < resp.toNumber(); i++) {
        getPoolInfo(i).then(resp => {
          ps.push(resp)
        }).catch(err => {
          console.log(`failed to get pool info for index: ${i} err: ${err}`)
        })
      }
      setPoolInfos(ps)
    })
    .catch(err => {
      console.log('Failed to get pool length: ', err)
    })

    boostedClient
      .query({
        query: gql(poolsQuery),
      })
      .then((boostedData) => {
        console.log("boostedData: ", boostedData);
        setTotalAllocPoint(boostedData.data.masterChefs[0].totalAllocPoint);
        setBoostedPools(boostedData.data.pools);
        let poolIds = boostedData.data.pools.map((d) => d.pair);
        // Just to ensure we always bring back the joe-usdc pair.
        poolIds.push("0x3bc40d4307cd946157447cd55d70ee7495ba6140");
        exchangeClient
          .query({
            query: gql(pairsQuery),
            variables: {
              ids: poolIds,
              user_id: userAddr,
            },
          })
          .then((data) => {
            console.log("exchangeData: ", data);
            setPairs(data.data.pairs);
            setSelectedPair(data.data.pairs[0]);
            setSelectedPairID(data.data.pairs[0].id);
            setLoading(false);
          })
          .catch((err) => {
            console.log("Error fetching data: ", err);
            setLoading(false);
          });
      })
      .catch((err) => {
        console.log("Error fetching data: ", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (userAddr === undefined || userAddr === "") {
      return;
    }
    veJoeClient
      .query({
        query: gql(veJoeQuery),
        variables: {
          id: userAddr,
        },
      })
      .then((data) => {
        console.log("veJoeQuery: ", data);
        setVeJoeData(data.data.veJoes[0]);
        setVEJoeSupply(data.data.veJoes[0].totalVeJoeMinted);
        setUserVeJoe(data.data.user);
        if (data.data.user !== null) {
          setJoeStake(data.data.user.veJoeBalance);
        }
      })
      .catch((err) => {
        console.log("Error fetching data: ", err);
      });

    let poolIds = boostedPools.map((d) => d.pair);
    exchangeClient
      .query({
        query: gql(pairsQuery),
        variables: {
          ids: poolIds,
          user_id: userAddr,
        },
      })
      .then((data) => {
        console.log("liquidity data: ", data);
        if (
          data.data.user !== null &&
          data.data.user.liquidityPositions.length > 0
        ) {
          setActualLiqTokens(
            data.data.user.liquidityPositions[0].liquidityTokenBalance
          );
        } else {
          setActualLiqTokens(0);
        }
      });
    setJoeStake(0);
    setToken0Value(0);
    setToken1Value(0);
  }, [userAddr]);

  useEffect(() => {
    let joePair = pairs.find(
      (pair) => pair.id === "0x3bc40d4307cd946157447cd55d70ee7495ba6140"
    );
    if (
      selectedPair !== null &&
      joePair !== undefined &&
      selectedBoostedPool !== undefined &&
      selectedBoostedPool.allocPoint !== undefined
    ) {
      const selectedPoolsJoePerSec =
        (selectedBoostedPool.allocPoint / totalAllocPoint) * joePerSecond;
      const joePriceInUSD = joePair.reserve1 / joePair.reserve0;
      let currentVeJoeBal = 0;
      if (userVeJoe !== null) {
        currentVeJoeBal = userVeJoe.veJoeBalance;
      }
      let poolInfo = poolInfos.find(p => p[0].toLowerCase() === selectedPair.id.toLowerCase())
      const totalDeposited = (token0Value * selectedPair.token0Price) + (token1Value * selectedPair.token1Price)
      if (poolInfo !== undefined) {
        setCurrentBoostedAPR(
          calcBoostedAPR(
            selectedPair,
            actualLiqTokens,
            currentVeJoeBal,
            joePriceInUSD,
            selectedPoolsJoePerSec,
            poolInfo,
            totalDeposited
          )
        );
        setEstimatedBoostedAPR(
          calcBoostedAPR(
            selectedPair,
            userLiqTokens,
            joeStake,
            joePriceInUSD,
            selectedPoolsJoePerSec,
            poolInfo,
            totalDeposited
          )
        );
      }
    }
  }, [
    userAddr,
    joeStake,
    userVeJoe,
    token0Value,
    token1Value,
    userLiqTokens,
    actualLiqTokens,
  ]);

  useEffect(() => {
    let joePair = pairs.find(
      (pair) => pair.id === "0x3bc40d4307cd946157447cd55d70ee7495ba6140"
    );

    if (
      selectedPair !== null &&
      selectedBoostedPool.allocPoint !== undefined &&
      joePair !== undefined
    ) {
      const formattedJoePerSecond = ethers.utils.formatUnits(joePerSecond, 18);
      const selectedPoolsJoePerSec =
        (selectedBoostedPool.allocPoint / totalAllocPoint) *
        formattedJoePerSecond;
      const joePriceInUSD = joePair.reserve1 / joePair.reserve0;
      const baseJoeRewardsPerSec = selectedPoolsJoePerSec * 0.5;
      const baseAPR = calcBaseAPR(
        selectedPair,
        baseJoeRewardsPerSec,
        joePriceInUSD
      );
      setBaseAPR(baseAPR);
    }
  }, [selectedPairID, selectedBoostedPool, selectedPair]);

  useEffect(() => {
    let p = pairs.find((pair) => pair.id === selectedPairID);
    let boostedPool = boostedPools.find(
      (bPool) => bPool.pair === selectedPairID
    );
    if (
      p !== undefined &&
      p !== null &&
      boostedPool !== undefined &&
      boostedPool !== null
    ) {
      setSelectedPair(p);
      setSelectedBoostedPool(boostedPool);
      setToken0Value(0);
      setToken1Value(0);
    }
  }, [selectedPairID]);

  useEffect(() => {
    const totalInPool = selectedPair.reserve0 * selectedPair.reserve1;
    const totalAddedByUser = token0Value * token1Value;
    const poolShare = (totalAddedByUser / totalInPool) * 100;
    const userLiqTokens =
      token0Value * (selectedPair.totalSupply / selectedPair.reserve0);
    setUserLiqTokens(userLiqTokens);
    setPoolShare(poolShare.toFixed(2));
  }, [token0Value, token1Value, selectedPair]);

  function setTokenAmount(tokenId, amount) {
    if (tokenId === 0) {
      setToken0Value(amount * selectedPair.token0Price);
      setToken1Value(amount);
    } else if (tokenId === 1) {
      setToken1Value(amount * selectedPair.token1Price);
      setToken0Value(amount);
    }
  }

  function handleJoeStake(value) {
    setJoeStake(value);
  }

  let boostedPairOptions = pairs.map((pair) => {
    return (
      <option key={pair.id} value={pair.id}>
        {pair.name}
      </option>
    );
  });

  return (
    <div className="calc-container">
      <div className="calc-inner-container">
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <img
            width="45"
            height="45"
            src={joe}
            style={{ marginRight: "10px" }}
          />
          <h1 className="header">Boosted Farm Calculator</h1>
        </div>
        <h3>Address</h3>
        <input
          style={{ width: "300px", marginBottom: "10px" }}
          placeholder={userAddr}
          type="text"
          onChange={(e) => setUserAddr(e.target.value)}
        />
        <h3>Farm</h3>
        {loading ? (
          <div style={{ marginBottom: "10px" }}>
            {loading ? "Loading pools..." : ""}
          </div>
        ) : (
          <select
            value={selectedPairID}
            onChange={(e) => setSelectedPairID(e.target.value)}
          >
            {boostedPairOptions}
          </select>
        )}
        <h3>Total Pool LP Tokens</h3>
        <div style={{ marginBottom: "20px" }}>
          <input type="number" placeholder={selectedPair?.totalSupply} />
        </div>
        <div className="pool-container">
          <div style={{ marginRight: "10px" }}>
            <h3>{selectedPair?.token0?.symbol}</h3>
            <input
              type="number"
              value={token0Value}
              onChange={(e) => setTokenAmount(1, e.target.value)}
              placeholder={selectedPair?.token0?.symbol}
            />
          </div>
          <div>
            <h3>{selectedPair?.token1?.symbol}</h3>
            <input
              type="number"
              value={token1Value}
              onChange={(e) => setTokenAmount(0, e.target.value)}
              placeholder={selectedPair?.token1?.symbol}
            />
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "20px",
          }}
        >
          <div style={{ marginRight: "20px" }}>Pool Share</div>
          <div>
            {poolShare > 0.1 ? <div>{poolShare}%</div> : <div>&lt;0.1%</div>}
          </div>
        </div>

        <h3
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <img
            style={{ marginRight: "10px" }}
            width="35"
            height="35"
            src={veJoeImg}
          />
          My veJoe
        </h3>
        <input
          placeholder={joeStake}
          type="number"
          onChange={(e) => handleJoeStake(e.target.value)}
        />

        <h3>Total veJoe Supply</h3>
        <input
          style={{ minWidth: "220px" }}
          type="number"
          placeholder={veJoeSupply}
          onChange={(e) => setVEJoeSupply(e.target.value)}
        />
        <div className="output-container">
          <div className="output">
            <div style={{ marginRight: "20px" }}>veJoe share</div>
            <div className="white">
              {(joeStake / veJoeSupply).toFixed(2) > 0.1
                ? (joeStake / veJoeSupply).toFixed(2)
                : "<0.1"}
              %
            </div>
          </div>
          <div className="output">
            <div style={{ marginRight: "20px" }}>Base APR</div>
            <div className="white">{baseAPR.toFixed(2)}%</div>
          </div>
          <div className="output">
            <div style={{ marginRight: "20px" }}>Current Boosted APR</div>
            <div className="white">{currentBoostedAPR.toFixed(2)}%</div>
          </div>
          <div className="output" style={{ color: "rgb(161, 165, 252)" }}>
            <div style={{ marginRight: "20px" }}>Estimated Boosted APR</div>
            <div>{estimatedBoostedAPR.toFixed(2)}%</div>
          </div>
          <div className="output">
            <div style={{ marginRight: "20px" }}>Total APR</div>
            <div className="white">{(estimatedBoostedAPR + baseAPR).toFixed(2)}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
