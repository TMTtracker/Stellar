function Shop() {
    return (
        <div className='min-h-screen bg-[#DCEFD6] text-[#1F2225] flex flex-col items-center justify-center p-6'>
            <div className='w-full max-w-xl text-center'>
                <div className='mx-auto mb-6 w-16 h-16 rounded-2xl bg-[#A9D8AE] text-white flex items-center justify-center'>
                    <svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='w-6 h-6'><path d='M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z'/><path d='M3 6h18'/><path d='M16 10a4 4 0 0 1-8 0'/></svg>
                </div>
                <h1 className='text-3xl font-extrabold tracking-tight'>The Shop</h1>
                <p className='text-[#6A6F73] mt-3'>
                    Complete quests and rewards to unlock buildings &amp; decorations for your world.
                </p>
            </div>
        </div>
    )
}

export default Shop
