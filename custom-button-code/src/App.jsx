import { BlackButton, WhiteButton, BlackOutlineButton, WhiteOutlineButton } from "./components"

const App = () => {
  return (
    <div className="border border-red-500 h-screen w-full">
      <div className="h-1/4 w-full border border-red-500 flex flex-col justify-center items-center"><BlackButton label="Learn More" /></div>
      <div className="h-1/4 w-full border border-red-500 flex flex-col justify-center items-center bg-black"><WhiteButton label="Contact Us" /></div>
      <div className="h-1/4 w-full border border-red-500 flex flex-col justify-center items-center "> <BlackOutlineButton label="Contact Us"/> </div>
      <div className="h-1/4 w-full border border-red-500 flex flex-col justify-center items-center bg-black"> <WhiteOutlineButton label="Learn More" /></div>

    </div>
  )
}

export default App
