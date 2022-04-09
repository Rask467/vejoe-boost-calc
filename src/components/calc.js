import React, { useState, useEffect } from "react";
import "./calc.css";
import veJoeImg from "../veJOE.png";
import joe from "../joe.png";
import { joePerSec } from "../utils/farms";
import { ethers } from "ethers";
import { ApolloClient, InMemoryCache, gql } from "@apollo/client";
import { poolsQuery, pairsQuery, veJoeQuery } from "../query";
import { boostedURL, exchangeURL, veJoeURL } from "../urls";

export default function Calc() {
  const [pairs, setPairs] = useState([]);
  const [boostedPools, setBoostedPools] = useState([]);
  const [selectedPairID, setSelectedPairID] = useState("");
  const [selectedPair, setSelectedPair] = useState({});
  const [selectedBoostedPool, setSelectedBoostedPool] = useState({});
  const [token0Value, setToken0Value] = useState(0);
  const [token1Value, setToken1Value] = useState(0);
  const [loading, setLoading] = useState(true);
  const [poolShare, setPoolShare] = useState(0);
  const [veJoeOrJoe, setVeJoeOrJoe] = useState("veJoe");
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
  const SECONDSPERYEAR = 31622400;
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
        console.log(resp);
        setUserAddr(resp[0]);
      });
    } catch (err) {
      alert(
        "Web3 provider not found. Please manually fill in your account address."
      );
    }

    joePerSec().then((resp) => {
      setJoePerSecond(resp);
    }).catch(err => {
      console.log("failed to load joePerSec: ", err)
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
            },
          })
          .then((data) => {
            console.log(data);
            setPairs(data.data.pairs);
            setSelectedPair(data.data.pairs[0]);
            setSelectedPairID(data.data.pairs[0].id);
            let boostedPool = boostedData.data.pools.find(
              (bPool) => bPool.pair === data.data.pairs[0]
            );
            setSelectedBoostedPool(boostedPool);
            setLoading(false)
          })
          .catch((err) => {
            console.log("Error fetching data: ", err);
            setLoading(false)
          })
      })
      .catch((err) => {
        console.log("Error fetching data: ", err);
        setLoading(false)
      })
  }, []);

  useEffect(() => {
    veJoeClient
      .query({
        query: gql(veJoeQuery),
        variables: {
          id: userAddr,
        },
      })
      .then((data) => {
        console.log('veJoeQuery: ', data);
        setVeJoeData(data.data.veJoes[0]);
        setVEJoeSupply(data.data.veJoes[0].totalVeJoeMinted);
        setUserVeJoe(data.data.user);
      })
      .catch((err) => {
        console.log("Error fetching data: ", err);
      });
  }, [userAddr]);

  useEffect(() => {
    let p = pairs.find((pair) => pair.id === selectedPairID);
    let boostedPool = boostedPools.find(
      (bPool) => bPool.pair === selectedPairID
    );
    let joePair = pairs.find(
      (pair) => pair.id === "0x3bc40d4307cd946157447cd55d70ee7495ba6140"
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
      console.log("boostedPool", boostedPool);
      console.log("p.allocPoint: ", boostedPool.allocPoint);
      console.log("totalAllocPoint: ", totalAllocPoint);
      console.log("joePerSec: ", joePerSecond);
      const poolsJoePerSec =
        (boostedPool.allocPoint / totalAllocPoint) * joePerSecond;
      const joePriceInUSD = joePair.reserve1 / joePair.reserve0;
      const baseJoeRewardsPerSec = poolsJoePerSec * 0.5;

      // Possible second way to calc apr
      const userLiq = p.totalSupply;
      // const rewardsPerSec = (userLiq * poolsJoePerSec * 0.5) / p.totalSupply
      // const rewardsPerYear = rewardsPerSec * SECONDSPERYEAR
      // const apr = (((rewardsPerYear/(10**18)) * joePriceInUSD) / p.reserveUSD) * 100
      // console.log("APR: ", apr)

      console.log("userLiq: ", userLiq);
      console.log("poolsJoePerSec: ", poolsJoePerSec);
      console.log("baseJoeRewardsPerSec: ", baseJoeRewardsPerSec);
      console.log("joePriceInUSD: ", joePriceInUSD);
      console.log("p.volumeUSD: ", p.volumeUSD);
      console.log("p.reserveUSD: ", p.reserveUSD);
      console.log("joeStake: ", joeStake);

      const baseAPR = calcBaseAPR(p, baseJoeRewardsPerSec, joePriceInUSD);
      console.log("baseAPR", baseAPR);
      setBaseAPR(baseAPR);

      let currentVeJoeBal = 0;
      if (userVeJoe !== null) {
        currentVeJoeBal = userVeJoe.veJoeBalance;
      }
      // I need to use the real numbers for userLiq in these equations
      setCurrentBoostedAPR(
        calcBoostedAPR(p, userLiq, currentVeJoeBal, joePriceInUSD)
      );
      setEstimatedBoostedAPR(
        calcBoostedAPR(p, userLiq, joeStake, joePriceInUSD)
      );
    }
  }, [selectedPairID, userAddr, joeStake, userVeJoe]);

  function calcBoostedAPR(p, userLiq, veJoe, joePriceInUSD) {
    const userFarmFactor = Math.sqrt(userLiq * veJoe);
    const totalFarmFactor = 1;
    console.log("userFarmFactor: ", userFarmFactor);
    const userBoostedRewardsPerSec =
      (userFarmFactor * joePerSecond * 0.5) / totalFarmFactor;
    console.log("userBoostedRewardsPerSec: ", userBoostedRewardsPerSec);
    const userBoostedRewardsPerYear = userBoostedRewardsPerSec * SECONDSPERYEAR;
    console.log("userBoostedRewardsPerYear: ", userBoostedRewardsPerYear);
    const boostedAPR =
      (((userBoostedRewardsPerYear / 10 ** 18) * joePriceInUSD) /
        p.reserveUSD) *
      100;
    console.log("boostedAPR: ", boostedAPR);
    return boostedAPR;
  }

  function calcBaseAPR(p, baseJoeRewardsPerSec, joePriceInUSD) {
    const baseJoeRewardsPerYear = baseJoeRewardsPerSec * SECONDSPERYEAR;
    const baseJoeAPR =
      (((baseJoeRewardsPerYear / 10 ** 18) * joePriceInUSD) / p.reserveUSD) *
      100;

    let volumeUSD;
    if (p.volumeUSD !== "0") {
      volumeUSD = p.volumeUSD;
    } else {
      const volumeToken0USD = p.volumeToken0 * p.token0Price;
      const volumeToken1USD = p.volumeToken1 * p.token1Price;
      volumeUSD = volumeToken0USD + volumeToken1USD;
    }
    const basePoolAPR = ((volumeUSD * 0.0025) / p.reserveUSD) * 100;

    console.log("baseJoeRewardsPerYear: ", baseJoeRewardsPerYear);
    console.log("baseJoeAPR", baseJoeAPR);
    return baseJoeAPR + basePoolAPR;
  }

  useEffect(() => {
    const totalInPool = selectedPair.reserve0 * selectedPair.reserve1;
    const totalAddedByUser = token0Value * token1Value;
    const poolShare = (totalAddedByUser / totalInPool) * 100;
    setPoolShare(poolShare.toFixed(2));
  }, [token0Value, token1Value]);

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
    <div class="calc-container">
      <div class="calc-inner-container">
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
          <h1 class="header">Boosted Pool Calculator</h1>
        </div>
        <h3>Address</h3>
        <input
          style={{ width: "300px", marginBottom: "10px" }}
          placeholder={userAddr}
          type="text"
          onChange={(e) => setUserAddr(e.target.value)}
        />
        <h3>Pool</h3>
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
        <h3>Pool liquidity</h3>
        <div style={{ marginBottom: "20px" }}>
          <input type="number" placeholder={selectedPair?.totalSupply} />
        </div>
        <div class="pool-container">
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

        <select
          style={{ marginTop: "15px" }}
          value={veJoeOrJoe}
          onChange={(e) => setVeJoeOrJoe(e.target.value)}
        >
          <option value="veJoe">veJoe</option>
          <option value="Joe">Joe</option>
        </select>

        <h3
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {veJoeOrJoe === "veJoe" ? (
            <img
              style={{ marginRight: "10px" }}
              width="35"
              height="35"
              src={veJoeImg}
            />
          ) : (
            <img
              style={{ marginRight: "10px" }}
              width="35"
              height="35"
              src={joe}
            />
          )}{" "}
          My {veJoeOrJoe}
        </h3>
        <input
          value={joeStake}
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
        <div class="output-container">
          <div class="output">
            <div style={{ marginRight: "20px" }}>veJoe share</div>
            <div class="white">
              {(joeStake / veJoeSupply).toFixed(2) > 0.1
                ? (joeStake / veJoeSupply).toFixed(2)
                : "<0.1"}
              %
            </div>
          </div>
          <div class="output">
            <div style={{ marginRight: "20px" }}>Base APR</div>
            <div class="white">{baseAPR.toFixed(2)}%</div>
          </div>
          <div class="output">
            <div style={{ marginRight: "20px" }}>Current Boosted APR</div>
            <div class="white">{currentBoostedAPR.toFixed(2)}%</div>
          </div>
          <div class="output" style={{ color: "rgb(161, 165, 252)" }}>
            <div style={{ marginRight: "20px" }}>Estimated Boosted APR</div>
            <div>{estimatedBoostedAPR.toFixed(2)}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
