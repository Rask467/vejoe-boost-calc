import React, { useState, useEffect } from 'react'
import { joePerSec } from '../utils/farms'
import { ethers } from 'ethers'
import { ApolloClient, InMemoryCache, gql } from '@apollo/client'

export default function Calc() {
    const [pairs, setPairs] = useState([])
    const [boostedPools, setBoostedPools] = useState([])
    const [selectedPairID, setSelectedPairID] = useState('')
    const [selectedPair, setSelectedPair] = useState({})
    const [selectedBoostedPool, setSelectedBoostedPool] = useState({})
    const [token0Value, setToken0Value] = useState(0)
    const [token1Value, setToken1Value] = useState(0)
    const [loading, setLoading] = useState(false)
    const [poolShare, setPoolShare] = useState(0)
    const [veJoeOrJoe, setVeJoeOrJoe] = useState('veJoe')
    const [veJoeData, setVeJoeData] = useState({})
    const [joeStake, setJoeStake] = useState(0)
    const [joePerSecond, setJoePerSecond] = useState(0)
    const [veJoeSupply, setVEJoeSupply] = useState(0)
    const [baseAPR, setBaseAPR] = useState(0)
    const [totalAllocPoint, setTotalAllocPoint] = useState(0)
    const [userAddr, setUserAddr] = useState('')
    const [userVeJoe, setUserVeJoe] = useState({})
    const BOOSTEDURL = 'https://api.thegraph.com/subgraphs/name/traderjoe-xyz/boosted-master-chef'
    const EXCHANGEURL = 'https://api.thegraph.com/subgraphs/name/traderjoe-xyz/exchange'
    const VEJOEURL = 'https://api.thegraph.com/subgraphs/name/traderjoe-xyz/vejoe'
    const SECONDSPERYEAR = 31622400

    const poolsQuery = `
        query {
            masterChefs {
                totalAllocPoint
            }
            pools {
                id
                pair
                allocPoint
                rewarder {
                  rewardToken
                  name
                  decimals
                  tokenPerSec
                }
            }
        }
    `

    const pairsQuery = `
        query($ids: [ID]) {
            pairs(where: {id_in: $ids}) {
                id
                name
                token0Price
                token1Price
                reserve0
                reserve1
                totalSupply
                reserveUSD
                volumeUSD
                volumeToken0
                volumeToken1
                token0 {
                    id
                    symbol
                }
                token1 {
                    id
                    symbol
                }
              }
        }
    `

    const veJoeQuery = `
    query($id: ID) {
        veJoes(first: 5) {
          id
          joeStaked
          joeStakedUSD
          totalVeJoeMinted
        }
        user(id: $id) {
            id
            veJoeBalance
        }
    }
    `

    const boostedClient = new ApolloClient({
        uri: BOOSTEDURL,
        cache: new InMemoryCache(),
    })

    const exchangeClient = new ApolloClient({
        uri: EXCHANGEURL,
        cache: new InMemoryCache(),
    })

    const veJoeClient = new ApolloClient({
        uri: VEJOEURL,
        cache: new InMemoryCache()
    })

    useEffect(() => {
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum)
            provider.send("eth_requestAccounts", []).then(resp => {
                console.log(resp)
                setUserAddr(resp[0])
            })
        } catch(err) {
            alert('Web3 provider not found. Please manually fill in your account address.')
        }
        

        joePerSec().then(resp => {
            setJoePerSecond(resp)
        })
        boostedClient
        .query({
            query: gql(poolsQuery),
        })
        .then((boostedData) => {
            setLoading(true)
            console.log('Subgraph data: ', boostedData)
            setTotalAllocPoint(boostedData.data.masterChefs[0].totalAllocPoint)
            setBoostedPools(boostedData.data.pools)
            let poolIds = boostedData.data.pools.map(d => d.pair)
            // Just to ensure we always bring back the joe-usdc pair.
            poolIds.push('0x3bc40d4307cd946157447cd55d70ee7495ba6140')
            exchangeClient
            .query({
                query: gql(pairsQuery),
                variables: {
                    ids: poolIds
                }
            })
            .then((data) => {
                console.log(data)
                setPairs(data.data.pairs)
                setSelectedPair(data.data.pairs[0])
                setSelectedPairID(data.data.pairs[0].id)
                let boostedPool = boostedData.data.pools.find(bPool => bPool.pair === data.data.pairs[0])
                setSelectedBoostedPool(boostedPool)
                setLoading(false)
            })
            .catch((err) => {
                console.log('Error fetching data: ', err)
                setLoading(false)
            })
        })
        .catch((err) => {
            console.log('Error fetching data: ', err)
            setLoading(false)
        })
    }, [])

    useEffect(() => {
        veJoeClient.query({
            query: gql(veJoeQuery),
            variables: {
                id: userAddr
            }
        })
        .then((data) => {
            console.log(data)
            setVeJoeData(data.data.veJoes[0])
            setVEJoeSupply(data.data.veJoes[0].totalVeJoeMinted)
            setUserVeJoe(data.data.user)
        })
        .catch((err) => {
            console.log('Error fetching data: ', err)
        })
    },[userAddr])

    useEffect(() => {
        let p = pairs.find(pair => pair.id === selectedPairID)
        let boostedPool = boostedPools.find(bPool => bPool.pair === selectedPairID)
        let joePair = pairs.find(pair => pair.id === '0x3bc40d4307cd946157447cd55d70ee7495ba6140')
        if (p !== undefined && p !== null && boostedPool !== undefined && boostedPool !== null) {
            setSelectedPair(p)
            setSelectedBoostedPool(boostedPool)
            setToken0Value(0)
            setToken1Value(0)
            console.log('boostedPool', boostedPool)
            console.log('p.allocPoint: ', boostedPool.allocPoint)
            console.log('totalAllocPoint: ', totalAllocPoint)
            console.log('joePerSec: ', joePerSecond)
            const poolsJoePerSec = (boostedPool.allocPoint/totalAllocPoint) * joePerSecond
            console.log('poolsJoePerSec: ', poolsJoePerSec)
            const baseJoeRewardsPerSec = poolsJoePerSec * 0.60
            console.log('baseJoeRewardsPerSec: ', baseJoeRewardsPerSec)
            const joePriceInUSD = joePair.reserve1 / joePair.reserve0
            console.log('joePriceInUSD: ', joePriceInUSD)
            const baseJoeRewardsPerYear = baseJoeRewardsPerSec * SECONDSPERYEAR
            console.log('baseJoeRewardsPerYear: ', baseJoeRewardsPerYear)
            const baseJoeAPR = (((baseJoeRewardsPerYear/(10**18)) * joePriceInUSD) / p.reserveUSD) * 100
            console.log('baseJoeAPR', baseJoeAPR)
            console.log('p.volumeUSD: ', p.volumeUSD)
            console.log('p.reserveUSD: ', p.reserveUSD)
            let volumeUSD
            if (p.volumeUSD !== '0') {
                volumeUSD = p.volumeUSD
            } else {
                const volumeToken0USD = p.volumeToken0 * p.token0Price
                const volumeToken1USD = p.volumeToken1 * p.token1Price
                volumeUSD = volumeToken0USD + volumeToken1USD
            }
            const basePoolAPR = ((volumeUSD * 0.0025) / p.reserveUSD) * 100
            console.log('basePoolAPR', basePoolAPR)
            setBaseAPR(baseJoeAPR + basePoolAPR)

            const boostedJoeRewardsPerSec = poolsJoePerSec * 0.40
            const boostedJoeRewardsPerYear = boostedJoeRewardsPerSec * SECONDSPERYEAR
        }
    }, [selectedPairID, userAddr])

    useEffect(() => {
        const totalInPool = selectedPair.reserve0 * selectedPair.reserve1
        const totalAddedByUser = token0Value * token1Value
        const poolShare = (totalAddedByUser / totalInPool) * 100
        setPoolShare(poolShare.toFixed(2))
    }, [token0Value, token1Value])

    let boostedPairOptions = pairs.map(pair => {
        return <option key={pair.id} value={pair.id} >{pair.name}</option>
    })

    function setTokenAmount(tokenId, amount) {
        if(tokenId === 0) {
            setToken0Value(amount * selectedPair.token0Price)
            setToken1Value(amount)
        } else if(tokenId === 1) {
            setToken1Value(amount * selectedPair.token1Price)
            setToken0Value(amount)
        }
    }

    function handleJoeStake(value) {
        setJoeStake(value)
    }

    return (
        <div>
            <h1>Booster Calculator</h1>
            <h3>My Staked Deposit</h3>
            <h3>Address</h3>
            <input style={{width: "300px", marginBottom: "10px"}} value={userAddr} type='text' placeholder='account address' onChange={e => setUserAddr(e.target.value)}/>
            <div style={{marginBottom: "10px"}}>
                {loading ? 'Loading pairs...' : ''}
            </div>
            <select value={selectedPairID} onChange={(e) => setSelectedPairID(e.target.value)}>
                {boostedPairOptions}
            </select>
            <h3>Pool liquidity</h3>
            <div style={{marginBottom: "20px"}}>
                <input type="number" placeholder={selectedPair?.totalSupply} />
            </div>
            <div>
                <h4>{selectedPair?.token0?.symbol}</h4>
                <input type="number" value={token0Value} onChange={(e) => setTokenAmount(1, e.target.value)} placeholder={selectedPair?.token0?.symbol} />
            </div>
            <div>
                <h4>{selectedPair?.token1?.symbol}</h4>
                <input type="number" value={token1Value} onChange={(e) => setTokenAmount(0, e.target.value)} placeholder={selectedPair?.token1?.symbol}/>
            </div>
            <div style={{display: "flex", justifyContent: "center", marginTop: "20px"}}>
                <div style={{marginRight: "20px"}}>Pool Share</div>
                <div>
                    {
                        poolShare > 0.1
                        ?
                        <div>{poolShare}%</div>
                        :
                        <div>&lt;0.1%</div>
                    }
                </div>
            </div>

            <select style={{marginTop: "15px"}} value={veJoeOrJoe} onChange={e => setVeJoeOrJoe(e.target.value)}>
                <option value="veJoe">veJoe</option>
                <option value="Joe">Joe</option>
            </select>

            <h3>My {veJoeOrJoe}</h3>
            <input value={userVeJoe?.veJoeBalance ? userVeJoe.veJoeBalance : 0} type="number" onChange={(e) => handleJoeStake(e.target.value)}/>

            <h3>Total veJoe Supply</h3>
            <input type="number" value={veJoeSupply} onChange={(e) => setVEJoeSupply(e.target.value)} />

            <div style={{display: "flex", justifyContent: "center"}}>
                <div style={{marginRight: "20px"}}>veJoe share</div>
                <div>
                    {(joeStake/veJoeSupply).toFixed(2) > 0.1 ? (joeStake/veJoeSupply).toFixed(2) : '<0.1'}%
                </div>
            </div> 
            <div style={{display: "flex", justifyContent: "center"}}>
                <div style={{marginRight: "20px"}}>Base APR</div>
                <div>{baseAPR}%</div>
            </div>
            <div style={{display: "flex", justifyContent: "center"}}>
                <div style={{marginRight: "20px"}}>Current Boosted APR</div>
                <div>2.00%</div>
            </div>
            <div style={{display: "flex", justifyContent: "center"}}>
                <div style={{marginRight: "20px"}}>Estimated Boosted APR</div>
                <div>1.00%</div>
            </div>
        </div>
    )
}