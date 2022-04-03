import React, { useState, useEffect } from 'react'
import { getJoeFarms, getPairInfo } from '../utils/farms'

export default function Calc() {
    const [farms, setFarms] = useState([])
    const [selectedFarm, setSelectedFarm] = useState('')
    const [token0, setToken0] = useState({})
    const [token1, setToken1] = useState({})
    const [totalSupply, setTotalSupply] = useState(0)
    const [reserve0, setReserve0] = useState(0)
    const [reserve1, setReserve1] = useState(0)
    const [token0Value, setToken0Value] = useState(0)
    const [token1Value, setToken1Value] = useState(0)

    useEffect(() => {
        async function fetchData () {
            let f = await getJoeFarms()
            console.log(f)
            let farmsWithPairInfo = await Promise.all(f.map(async (farm) => {
                const pairInfo = await getPairInfo(farm[0])
                return {pairInfo, farm: farm}
            }))
            console.log("farms with name: ", farmsWithPairInfo)
            setFarms(farmsWithPairInfo)
        }
        fetchData()
    }, [])

    useEffect(() => {
        let f = farms.find(farm => farm.farm[0] === selectedFarm)
        if (f !== undefined & f !== null) {
            setToken0({token0Addr: f?.pairInfo.token0, token0Symbol: f?.pairInfo.token0Symbol})
            setToken1({token1Addr: f?.pairInfo.token1, token1Symbol: f?.pairInfo.token1Symbol})
            setTotalSupply(f?.pairInfo.totalSupply)
            setReserve0(f?.pairInfo.reserve0)
            setReserve1(f?.pairInfo.reserve1)
            setToken0Value(0)
            setToken1Value(0)
        }
    }, [selectedFarm])

    let boostedFarmOptions = farms.map(farm => {
        if(farm !== undefined && farm.farm !== undefined) {
            return <option key={farm.farm[0]} value={farm.farm[0]} >{farm.pairInfo.name}</option>
        }
    })

    function setTokenAmount(tokenId, amount) {
        if(tokenId === 0) {
            const token0Ratio = reserve0 / reserve1
            console.log(token0Ratio)
            setToken0Value(token0Ratio * amount)
            setToken1Value(amount)
        } else if(tokenId === 1) {
            const token1Ratio = reserve1 / reserve0
            console.log(token1Ratio)
            setToken1Value(token1Ratio * amount)
            setToken0Value(amount)
        }
    }

    return (
        <div>
            <h1>Booster Calculator</h1>
            <h3>My Staked Deposit</h3>
            <select value={selectedFarm} onChange={(e) => setSelectedFarm(e.target.value)}>
                {boostedFarmOptions}
            </select>
            <h3>Pool liquidity</h3>
            <div style={{marginBottom: "20px"}}>
                <input type="number" placeholder={totalSupply} />
            </div>
            <input type="number" value={token0Value} onChange={(e) => setTokenAmount(1, e.target.value)} placeholder={token0?.token0Symbol} />
            <input type="number" value={token1Value} onChange={(e) => setTokenAmount(0, e.target.value)} placeholder={token1?.token1Symbol}/>
            <div style={{display: "flex", justifyContent: "center", marginTop: "20px"}}>
                <div style={{marginRight: "20px"}}>Pool Share</div>
                <div>0.00%</div>
            </div>

            <select>
                <option>veJoe</option>
                <option>Joe</option>
            </select>

            <h3>My veJoe</h3>
            <input type="number" />

            <h3>Total veJoe Supply</h3>
            <input type="number" />

            <div style={{display: "flex", justifyContent: "center"}}>
                <div style={{marginRight: "20px"}}>veJoe share</div>
                <div>0.00%</div>
            </div> 
            <div style={{display: "flex", justifyContent: "center"}}>
                <div style={{marginRight: "20px"}}>Base APR</div>
                <div>5.00%</div>
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